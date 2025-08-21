#!/usr/bin/env python3
"""
Main CLI interface for the grants pipeline
Author: Shiloh TD
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

from .core.pipeline import GrantsPipeline, GrantsProcessor
from .config.settings import ConfigManager
from .outputs.json_exporter import JSONExporter


def setup_logging(level: str = 'INFO', log_file: Optional[str] = None) -> logging.Logger:
    """Set up logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            *([logging.FileHandler(log_file)] if log_file else [])
        ]
    )
    return logging.getLogger('grants_pipeline')


def create_example_config(args):
    """Create an example configuration file"""
    config_manager = ConfigManager()
    
    try:
        config_manager.create_example_config(args.output)
        print(f"Example configuration created at: {args.output}")
        return 0
    except Exception as e:
        print(f"Error creating example config: {str(e)}")
        return 1


def validate_config(args):
    """Validate configuration file"""
    try:
        config_manager = ConfigManager(args.config)
        errors = config_manager.validate_config()
        
        if errors:
            print("Configuration validation errors:")
            for error in errors:
                print(f"  - {error}")
            return 1
        else:
            print("Configuration is valid")
            return 0
    except Exception as e:
        print(f"Error validating config: {str(e)}")
        return 1


def list_sources(args):
    """List all available data sources"""
    from .sources import registry
    
    print("Available data sources:")
    for source_name in registry.list_sources():
        print(f"  - {source_name}")
    
    if args.config:
        try:
            config_manager = ConfigManager(args.config)
            configured_sources = config_manager.list_sources()
            
            if configured_sources:
                print(f"\nConfigured sources in {args.config}:")
                for source in configured_sources:
                    status = "enabled" if source.get('enabled', True) else "disabled"
                    print(f"  - {source['name']} ({status})")
            else:
                print(f"\nNo sources configured in {args.config}")
        except Exception as e:
            print(f"Error reading config: {str(e)}")
    
    return 0


def run_pipeline(args):
    """Run the grants pipeline"""
    # Set up logging
    logger = setup_logging(args.log_level, args.log_file)
    logger.info("Starting grants pipeline")
    
    try:
        # Initialize configuration
        config_manager = ConfigManager(args.config)
        config_manager.apply_environment_overrides()
        
        # Validate configuration
        errors = config_manager.validate_config()
        if errors:
            logger.error("Configuration validation failed:")
            for error in errors:
                logger.error(f"  - {error}")
            return 1
        
        # Initialize pipeline
        pipeline = GrantsPipeline(args.config, logger)
        
        # Add command line source if specified
        if args.source and args.source_config:
            pipeline.add_source(args.source, **args.source_config)
        
        # Process grants
        kwargs = {}
        if args.max_records:
            kwargs['max_records'] = args.max_records
        if hasattr(args, 'future_only'):
            kwargs['future_only'] = args.future_only
        
        if args.source_only:
            # Process specific source only
            source_name = args.source_only
            logger.info(f"Processing only source: {source_name}")
            grants = list(pipeline.get_source_grants(source_name, **kwargs))
        else:
            # Process all sources
            logger.info("Processing all enabled sources")
            results = pipeline.process_all_sources(**kwargs)
            grants = pipeline.collect_all_grants(**kwargs)
        
        if not grants:
            logger.warning("No grants collected from sources")
            return 0
        
        # Process grants
        processor = GrantsProcessor(logger)
        
        if config_manager.get('pipeline.enable_deduplication', True):
            logger.info("Deduplicating grants")
            grants = processor.deduplicate_grants(grants)
        
        logger.info("Cleaning grants data")
        grants = processor.clean_grants(grants)
        
        # Sort grants
        sort_by = config_manager.get('pipeline.default_sort', 'close_date')
        logger.info(f"Sorting grants by {sort_by}")
        grants = processor.sort_grants(grants, sort_by)
        
        # Export results
        output_dir = config_manager.get('output.output_dir', './output')
        exporter = JSONExporter(output_dir, logger)
        
        # Export main grants file
        if args.output_file:
            exporter.export_single_file(grants, args.output_file)
        else:
            grants_file = exporter.export_grants(grants)
            logger.info(f"Grants exported to: {grants_file}")
        
        # Export web format if requested
        if args.web_output or config_manager.get('output.web_output_dir'):
            web_dir = args.web_output or config_manager.get('output.web_output_dir', './web')
            web_file = Path(web_dir) / 'grants_data.json'
            exporter.export_web_format(grants, str(web_file))
            logger.info(f"Web format exported to: {web_file}")
        
        # Export statistics
        if args.stats:
            stats_file = exporter.export_statistics(grants)
            logger.info(f"Statistics exported to: {stats_file}")
        
        # Print summary
        logger.info(f"Pipeline completed successfully. Processed {len(grants)} grants.")
        
        if hasattr(pipeline, 'results') and pipeline.results:
            stats = pipeline.get_statistics()
            logger.info(f"Success rate: {stats['success_rate']:.1f}%")
        
        return 0
        
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        if args.debug:
            import traceback
            traceback.print_exc()
        return 1


def add_source_cmd(args):
    """Add a source to configuration"""
    try:
        config_manager = ConfigManager(args.config)
        
        # Parse source config from command line
        source_config = {}
        if args.source_config:
            for config_item in args.source_config:
                if '=' in config_item:
                    key, value = config_item.split('=', 1)
                    source_config[key] = value
        
        config_manager.add_source(args.source, args.enabled, **source_config)
        config_manager.save_config()
        
        print(f"Added source '{args.source}' to configuration")
        return 0
    except Exception as e:
        print(f"Error adding source: {str(e)}")
        return 1


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description="NVCA Grants Pipeline")
    parser.add_argument('--version', action='version', version='1.0.0')
    
    # Global options
    parser.add_argument('-c', '--config', help='Configuration file path')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    parser.add_argument('--log-file', help='Log file path')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Config commands
    config_parser = subparsers.add_parser('config', help='Configuration management')
    config_subparsers = config_parser.add_subparsers(dest='config_command')
    
    # Create example config
    example_parser = config_subparsers.add_parser('example', help='Create example configuration')
    example_parser.add_argument('output', help='Output path for example config')
    
    # Validate config
    validate_parser = config_subparsers.add_parser('validate', help='Validate configuration')
    validate_parser.add_argument('config', help='Configuration file to validate')
    
    # List sources
    sources_parser = subparsers.add_parser('sources', help='List available data sources')
    
    # Add source
    add_source_parser = subparsers.add_parser('add-source', help='Add data source to config')
    add_source_parser.add_argument('source', help='Source name')
    add_source_parser.add_argument('--enabled', action='store_true', default=True, help='Enable source')
    add_source_parser.add_argument('--source-config', nargs='*', help='Source config (key=value pairs)')
    
    # Run pipeline
    run_parser = subparsers.add_parser('run', help='Run the grants pipeline')
    run_parser.add_argument('-c', '--config', help='Configuration file path')
    run_parser.add_argument('-o', '--output-file', help='Output file path')
    run_parser.add_argument('-w', '--web-output', help='Web output directory')
    run_parser.add_argument('--stats', action='store_true', help='Export statistics')
    run_parser.add_argument('--max-records', type=int, help='Maximum records per source')
    run_parser.add_argument('--future-only', action='store_true', default=True, help='Only future grants')
    run_parser.add_argument('--source', help='Add single source')
    run_parser.add_argument('--source-config', type=dict, help='Source configuration')
    run_parser.add_argument('--source-only', help='Process only specified source')
    
    args = parser.parse_args()
    
    # Handle commands
    if args.command == 'config':
        if args.config_command == 'example':
            return create_example_config(args)
        elif args.config_command == 'validate':
            return validate_config(args)
    elif args.command == 'sources':
        return list_sources(args)
    elif args.command == 'add-source':
        return add_source_cmd(args)
    elif args.command == 'run':
        return run_pipeline(args)
    else:
        parser.print_help()
        return 1


if __name__ == '__main__':
    sys.exit(main())