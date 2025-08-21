#!/usr/bin/env python3
"""
Main pipeline for processing grants data
Author: Shiloh TD
"""

import logging
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Iterator
from pathlib import Path
import json

from .models import Grant, ProcessingResult, SourceConfig
from ..sources import registry


class GrantsPipeline:
    """Main pipeline for processing grants from multiple sources"""
    
    def __init__(self, config_path: Optional[str] = None, logger: Optional[logging.Logger] = None):
        """
        Initialize the grants pipeline
        
        Args:
            config_path: Path to configuration file
            logger: Optional logger instance
        """
        self.logger = logger or self._setup_logger()
        self.config_path = Path(config_path) if config_path else None
        self.sources_config: List[SourceConfig] = []
        self.results: List[ProcessingResult] = []
        
        if self.config_path and self.config_path.exists():
            self.load_config()
    
    def _setup_logger(self) -> logging.Logger:
        """Set up logging for the pipeline"""
        logger = logging.getLogger('GrantsPipeline')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def load_config(self) -> None:
        """Load pipeline configuration from file"""
        try:
            self.logger.info(f"Loading configuration from {self.config_path}")
            
            if self.config_path.suffix.lower() == '.json':
                with open(self.config_path, 'r') as f:
                    config_data = json.load(f)
            elif self.config_path.suffix.lower() in ['.yml', '.yaml']:
                try:
                    import yaml
                    with open(self.config_path, 'r') as f:
                        config_data = yaml.safe_load(f)
                except ImportError:
                    raise ImportError("PyYAML required for YAML configuration files")
            else:
                raise ValueError(f"Unsupported config file format: {self.config_path.suffix}")
            
            # Parse source configurations
            self.sources_config = []
            for source_data in config_data.get('sources', []):
                source_config = SourceConfig(**source_data)
                self.sources_config.append(source_config)
            
            self.logger.info(f"Loaded {len(self.sources_config)} source configurations")
            
        except Exception as e:
            self.logger.error(f"Error loading configuration: {str(e)}")
            raise
    
    def add_source(self, name: str, enabled: bool = True, **config) -> None:
        """
        Add a data source to the pipeline
        
        Args:
            name: Name of the data source
            enabled: Whether the source is enabled
            **config: Configuration options for the source
        """
        source_config = SourceConfig(
            name=name,
            enabled=enabled,
            config=config
        )
        self.sources_config.append(source_config)
        self.logger.info(f"Added source: {name}")
    
    def process_all_sources(self, **kwargs) -> List[ProcessingResult]:
        """
        Process all configured data sources
        
        Returns:
            List of ProcessingResult objects
        """
        self.logger.info("Starting pipeline processing of all sources")
        self.results = []
        
        enabled_sources = [s for s in self.sources_config if s.enabled]
        self.logger.info(f"Processing {len(enabled_sources)} enabled sources")
        
        for source_config in enabled_sources:
            try:
                result = self.process_source(source_config, **kwargs)
                self.results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to process source {source_config.name}: {str(e)}")
                # Create error result
                error_result = ProcessingResult(
                    source=source_config.name,
                    total_processed=0,
                    successful=0,
                    failed=0,
                    errors=[f"Pipeline error: {str(e)}"]
                )
                self.results.append(error_result)
        
        self._log_summary()
        return self.results
    
    def process_source(self, source_config: SourceConfig, **kwargs) -> ProcessingResult:
        """
        Process a single data source
        
        Args:
            source_config: Configuration for the source
            **kwargs: Additional arguments passed to source processing
            
        Returns:
            ProcessingResult object
        """
        self.logger.info(f"Processing source: {source_config.name}")
        
        # Get source class from registry
        source_class = registry.get_source(source_config.name)
        if not source_class:
            raise ValueError(f"Unknown source: {source_config.name}")
        
        # Create source instance
        source = source_class(source_config.config, self.logger)
        
        # Process grants
        return source.process_grants(**kwargs)
    
    def get_all_grants(self, **kwargs) -> Iterator[Grant]:
        """
        Get all grants from all enabled sources
        
        Yields:
            Grant objects from all sources
        """
        enabled_sources = [s for s in self.sources_config if s.enabled]
        
        for source_config in enabled_sources:
            try:
                self.logger.info(f"Fetching grants from {source_config.name}")
                
                source_class = registry.get_source(source_config.name)
                if not source_class:
                    self.logger.error(f"Unknown source: {source_config.name}")
                    continue
                
                source = source_class(source_config.config, self.logger)
                
                for grant in source.fetch_grants(**kwargs):
                    yield grant
                    
            except Exception as e:
                self.logger.error(f"Error fetching from {source_config.name}: {str(e)}")
                continue
    
    def collect_all_grants(self, **kwargs) -> List[Grant]:
        """
        Collect all grants from all sources into a list
        
        Returns:
            List of all Grant objects
        """
        grants = list(self.get_all_grants(**kwargs))
        self.logger.info(f"Collected {len(grants)} grants from all sources")
        return grants
    
    def get_source_grants(self, source_name: str, **kwargs) -> Iterator[Grant]:
        """
        Get grants from a specific source
        
        Args:
            source_name: Name of the source to query
            **kwargs: Arguments passed to source
            
        Yields:
            Grant objects from the specified source
        """
        source_config = None
        for config in self.sources_config:
            if config.name == source_name:
                source_config = config
                break
        
        if not source_config:
            raise ValueError(f"Source not configured: {source_name}")
        
        if not source_config.enabled:
            self.logger.warning(f"Source {source_name} is disabled")
            return
        
        source_class = registry.get_source(source_name)
        if not source_class:
            raise ValueError(f"Unknown source: {source_name}")
        
        source = source_class(source_config.config, self.logger)
        yield from source.fetch_grants(**kwargs)
    
    def validate_sources(self) -> Dict[str, List[str]]:
        """
        Validate all configured sources
        
        Returns:
            Dictionary mapping source names to validation errors
        """
        validation_results = {}
        
        for source_config in self.sources_config:
            if not source_config.enabled:
                continue
            
            source_class = registry.get_source(source_config.name)
            if not source_class:
                validation_results[source_config.name] = [f"Unknown source type: {source_config.name}"]
                continue
            
            try:
                source = source_class(source_config.config, self.logger)
                errors = source.validate_config()
                validation_results[source_config.name] = errors
            except Exception as e:
                validation_results[source_config.name] = [f"Error creating source: {str(e)}"]
        
        return validation_results
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get processing statistics from the last run"""
        if not self.results:
            return {}
        
        total_processed = sum(r.total_processed for r in self.results)
        total_successful = sum(r.successful for r in self.results)
        total_failed = sum(r.failed for r in self.results)
        total_time = sum(r.processing_time for r in self.results)
        
        stats = {
            'sources_processed': len(self.results),
            'total_records': total_processed,
            'successful_records': total_successful,
            'failed_records': total_failed,
            'success_rate': (total_successful / total_processed * 100) if total_processed > 0 else 0,
            'total_processing_time': total_time,
            'by_source': {}
        }
        
        for result in self.results:
            stats['by_source'][result.source] = {
                'processed': result.total_processed,
                'successful': result.successful,
                'failed': result.failed,
                'success_rate': result.success_rate(),
                'processing_time': result.processing_time,
                'errors': len(result.errors),
                'warnings': len(result.warnings)
            }
        
        return stats
    
    def _log_summary(self) -> None:
        """Log processing summary"""
        stats = self.get_statistics()
        
        self.logger.info("=" * 50)
        self.logger.info("PIPELINE PROCESSING SUMMARY")
        self.logger.info("=" * 50)
        self.logger.info(f"Sources processed: {stats['sources_processed']}")
        self.logger.info(f"Total records: {stats['total_records']:,}")
        self.logger.info(f"Successful: {stats['successful_records']:,}")
        self.logger.info(f"Failed: {stats['failed_records']:,}")
        self.logger.info(f"Success rate: {stats['success_rate']:.1f}%")
        self.logger.info(f"Total time: {stats['total_processing_time']:.2f}s")
        
        self.logger.info("\nBy Source:")
        for source_name, source_stats in stats['by_source'].items():
            self.logger.info(f"  {source_name}: {source_stats['successful']:,} successful, "
                           f"{source_stats['failed']:,} failed, "
                           f"{source_stats['success_rate']:.1f}% success rate")
    
    def save_config(self, path: str) -> None:
        """Save current configuration to file"""
        config_data = {
            'sources': [config.to_dict() for config in self.sources_config]
        }
        
        config_path = Path(path)
        
        if config_path.suffix.lower() == '.json':
            with open(config_path, 'w') as f:
                json.dump(config_data, f, indent=2)
        elif config_path.suffix.lower() in ['.yml', '.yaml']:
            try:
                import yaml
                with open(config_path, 'w') as f:
                    yaml.dump(config_data, f, default_flow_style=False)
            except ImportError:
                raise ImportError("PyYAML required for YAML configuration files")
        else:
            raise ValueError(f"Unsupported config file format: {config_path.suffix}")
        
        self.logger.info(f"Configuration saved to {config_path}")


class GrantsProcessor:
    """Processor for cleaning, enriching, and transforming grants data"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or logging.getLogger('GrantsProcessor')
    
    def clean_grants(self, grants: List[Grant]) -> List[Grant]:
        """Clean and validate grants data"""
        cleaned_grants = []
        
        for grant in grants:
            # Validate grant
            errors = grant.validate()
            if errors:
                self.logger.warning(f"Grant {grant.id} validation errors: {', '.join(errors)}")
                # Skip grants with critical errors
                if any('required' in error.lower() for error in errors):
                    continue
            
            # Clean data
            cleaned_grant = self._clean_grant(grant)
            cleaned_grants.append(cleaned_grant)
        
        self.logger.info(f"Cleaned {len(cleaned_grants)} grants from {len(grants)} input grants")
        return cleaned_grants
    
    def _clean_grant(self, grant: Grant) -> Grant:
        """Clean individual grant data"""
        # Truncate description if too long
        if grant.description and len(grant.description) > 1000:
            grant.description = grant.description[:997] + "..."
        
        # Clean title
        if grant.title:
            grant.title = grant.title.strip()[:200]
        
        # Ensure positive funding amounts
        if grant.award_floor is not None and grant.award_floor < 0:
            grant.award_floor = None
        if grant.award_ceiling is not None and grant.award_ceiling < 0:
            grant.award_ceiling = None
        if grant.total_funding is not None and grant.total_funding < 0:
            grant.total_funding = None
        
        return grant
    
    def deduplicate_grants(self, grants: List[Grant]) -> List[Grant]:
        """Remove duplicate grants based on ID and title"""
        seen = set()
        unique_grants = []
        
        for grant in grants:
            # Create unique key based on ID and title
            key = f"{grant.source}:{grant.id}:{grant.title.lower()}"
            
            if key not in seen:
                seen.add(key)
                unique_grants.append(grant)
            else:
                self.logger.debug(f"Skipping duplicate grant: {grant.title}")
        
        removed_count = len(grants) - len(unique_grants)
        if removed_count > 0:
            self.logger.info(f"Removed {removed_count} duplicate grants")
        
        return unique_grants
    
    def sort_grants(self, grants: List[Grant], sort_by: str = 'close_date') -> List[Grant]:
        """Sort grants by specified field"""
        if sort_by == 'close_date':
            return sorted(grants, key=lambda g: g.close_date or date(9999, 12, 31))
        elif sort_by == 'posted_date':
            return sorted(grants, key=lambda g: g.posted_date or date(1900, 1, 1), reverse=True)
        elif sort_by == 'title':
            return sorted(grants, key=lambda g: g.title.lower())
        elif sort_by == 'agency':
            return sorted(grants, key=lambda g: g.agency.lower())
        else:
            self.logger.warning(f"Unknown sort field: {sort_by}")
            return grants