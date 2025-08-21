#!/usr/bin/env python3
"""
Configuration management for the grants pipeline
Author: Shiloh TD
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging


class ConfigManager:
    """Manages configuration for the grants pipeline"""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize configuration manager
        
        Args:
            config_file: Path to configuration file (optional)
        """
        self.logger = logging.getLogger('ConfigManager')
        self.config_file = Path(config_file) if config_file else None
        self.config_data: Dict[str, Any] = {}
        
        # Default configuration
        self.defaults = {
            'pipeline': {
                'max_records_per_source': 10000,
                'future_only': True,
                'enable_deduplication': True,
                'default_sort': 'close_date'
            },
            'processing': {
                'chunk_size': 1000,
                'max_workers': 4,
                'timeout_seconds': 300
            },
            'output': {
                'formats': ['json', 'csv'],
                'output_dir': './output',
                'web_output_dir': './web'
            },
            'logging': {
                'level': 'INFO',
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'file': None
            },
            'sources': []
        }
        
        # Load configuration if file exists
        if self.config_file and self.config_file.exists():
            self.load_config()
        else:
            self.config_data = self.defaults.copy()
    
    def load_config(self) -> None:
        """Load configuration from file"""
        try:
            self.logger.info(f"Loading configuration from {self.config_file}")
            
            if self.config_file.suffix.lower() == '.json':
                with open(self.config_file, 'r') as f:
                    loaded_config = json.load(f)
            elif self.config_file.suffix.lower() in ['.yml', '.yaml']:
                try:
                    import yaml
                    with open(self.config_file, 'r') as f:
                        loaded_config = yaml.safe_load(f)
                except ImportError:
                    raise ImportError("PyYAML required for YAML configuration files")
            else:
                raise ValueError(f"Unsupported config file format: {self.config_file.suffix}")
            
            # Merge with defaults
            self.config_data = self._merge_config(self.defaults, loaded_config)
            
        except Exception as e:
            self.logger.error(f"Error loading configuration: {str(e)}")
            self.logger.info("Using default configuration")
            self.config_data = self.defaults.copy()
    
    def save_config(self, path: Optional[str] = None) -> None:
        """Save current configuration to file"""
        save_path = Path(path) if path else self.config_file
        
        if not save_path:
            raise ValueError("No save path specified")
        
        try:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            
            if save_path.suffix.lower() == '.json':
                with open(save_path, 'w') as f:
                    json.dump(self.config_data, f, indent=2)
            elif save_path.suffix.lower() in ['.yml', '.yaml']:
                try:
                    import yaml
                    with open(save_path, 'w') as f:
                        yaml.dump(self.config_data, f, default_flow_style=False)
                except ImportError:
                    raise ImportError("PyYAML required for YAML configuration files")
            else:
                raise ValueError(f"Unsupported config file format: {save_path.suffix}")
            
            self.logger.info(f"Configuration saved to {save_path}")
            
        except Exception as e:
            self.logger.error(f"Error saving configuration: {str(e)}")
            raise
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        
        Args:
            key: Configuration key (e.g., 'pipeline.max_records_per_source')
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        keys = key.split('.')
        value = self.config_data
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any) -> None:
        """
        Set configuration value using dot notation
        
        Args:
            key: Configuration key (e.g., 'pipeline.max_records_per_source')
            value: Value to set
        """
        keys = key.split('.')
        config = self.config_data
        
        # Navigate to parent
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        # Set value
        config[keys[-1]] = value
    
    def get_source_config(self, source_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific source"""
        sources = self.get('sources', [])
        
        for source in sources:
            if source.get('name') == source_name:
                return source
        
        return None
    
    def add_source(self, name: str, enabled: bool = True, **config) -> None:
        """Add a new data source configuration"""
        sources = self.get('sources', [])
        
        # Check if source already exists
        for i, source in enumerate(sources):
            if source.get('name') == name:
                # Update existing source
                sources[i] = {
                    'name': name,
                    'enabled': enabled,
                    'config': config
                }
                self.set('sources', sources)
                return
        
        # Add new source
        new_source = {
            'name': name,
            'enabled': enabled,
            'config': config
        }
        sources.append(new_source)
        self.set('sources', sources)
    
    def remove_source(self, name: str) -> bool:
        """Remove a data source configuration"""
        sources = self.get('sources', [])
        
        for i, source in enumerate(sources):
            if source.get('name') == name:
                del sources[i]
                self.set('sources', sources)
                return True
        
        return False
    
    def enable_source(self, name: str, enabled: bool = True) -> bool:
        """Enable or disable a data source"""
        sources = self.get('sources', [])
        
        for source in sources:
            if source.get('name') == name:
                source['enabled'] = enabled
                self.set('sources', sources)
                return True
        
        return False
    
    def list_sources(self) -> List[Dict[str, Any]]:
        """List all configured sources"""
        return self.get('sources', [])
    
    def validate_config(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        # Validate output directory
        output_dir = self.get('output.output_dir')
        if output_dir:
            try:
                Path(output_dir).mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create output directory {output_dir}: {str(e)}")
        
        # Validate sources
        sources = self.get('sources', [])
        for i, source in enumerate(sources):
            if not source.get('name'):
                errors.append(f"Source {i} missing name")
            
            if not isinstance(source.get('enabled'), bool):
                errors.append(f"Source {source.get('name', i)} enabled must be boolean")
        
        # Validate pipeline settings
        max_records = self.get('pipeline.max_records_per_source')
        if max_records and not isinstance(max_records, int):
            errors.append("pipeline.max_records_per_source must be an integer")
        
        return errors
    
    def create_example_config(self, path: str) -> None:
        """Create an example configuration file"""
        example_config = {
            'pipeline': {
                'max_records_per_source': 10000,
                'future_only': True,
                'enable_deduplication': True,
                'default_sort': 'close_date'
            },
            'processing': {
                'chunk_size': 1000,
                'max_workers': 4,
                'timeout_seconds': 300
            },
            'output': {
                'formats': ['json', 'csv'],
                'output_dir': './output',
                'web_output_dir': './web'
            },
            'logging': {
                'level': 'INFO',
                'file': 'pipeline.log'
            },
            'sources': [
                {
                    'name': 'grants.gov',
                    'enabled': True,
                    'update_frequency': 'daily',
                    'config': {
                        'file_path': './data/grants_database.csv'
                    }
                },
                {
                    'name': 'grants.gov.xml',
                    'enabled': False,
                    'update_frequency': 'weekly',
                    'config': {
                        'file_path': './data/grants_extract.xml'
                    }
                }
            ]
        }
        
        config_path = Path(path)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        if config_path.suffix.lower() == '.json':
            with open(config_path, 'w') as f:
                json.dump(example_config, f, indent=2)
        elif config_path.suffix.lower() in ['.yml', '.yaml']:
            try:
                import yaml
                with open(config_path, 'w') as f:
                    yaml.dump(example_config, f, default_flow_style=False)
            except ImportError:
                raise ImportError("PyYAML required for YAML configuration files")
        else:
            raise ValueError(f"Unsupported config file format: {config_path.suffix}")
        
        self.logger.info(f"Example configuration created at {config_path}")
    
    def get_environment_overrides(self) -> Dict[str, Any]:
        """Get configuration overrides from environment variables"""
        overrides = {}
        
        # Define environment variable mappings
        env_mappings = {
            'GRANTS_MAX_RECORDS': 'pipeline.max_records_per_source',
            'GRANTS_FUTURE_ONLY': 'pipeline.future_only',
            'GRANTS_OUTPUT_DIR': 'output.output_dir',
            'GRANTS_LOG_LEVEL': 'logging.level',
            'GRANTS_LOG_FILE': 'logging.file'
        }
        
        for env_var, config_key in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                # Convert value to appropriate type
                if config_key.endswith('.future_only'):
                    env_value = env_value.lower() in ['true', '1', 'yes']
                elif config_key.endswith('.max_records_per_source'):
                    env_value = int(env_value)
                
                # Set override
                keys = config_key.split('.')
                current = overrides
                for key in keys[:-1]:
                    if key not in current:
                        current[key] = {}
                    current = current[key]
                current[keys[-1]] = env_value
        
        return overrides
    
    def apply_environment_overrides(self) -> None:
        """Apply environment variable overrides to configuration"""
        overrides = self.get_environment_overrides()
        if overrides:
            self.config_data = self._merge_config(self.config_data, overrides)
            self.logger.info("Applied environment variable overrides")
    
    def _merge_config(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively merge configuration dictionaries"""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._merge_config(result[key], value)
            else:
                result[key] = value
        
        return result