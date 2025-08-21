#!/usr/bin/env python3
"""
Base classes for data sources in the grants pipeline
Author: Shiloh TD
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Iterator
from datetime import datetime
import logging

from ..core.models import Grant, ProcessingResult


class DataSource(ABC):
    """Abstract base class for all data sources"""
    
    def __init__(self, config: Dict[str, Any], logger: Optional[logging.Logger] = None):
        """
        Initialize data source
        
        Args:
            config: Configuration dictionary specific to this data source
            logger: Optional logger instance
        """
        self.config = config
        self.logger = logger or logging.getLogger(self.__class__.__name__)
        self.source_name = self.__class__.__name__.lower().replace('source', '')
    
    @abstractmethod
    def get_source_name(self) -> str:
        """Return the name of this data source (e.g., 'grants.gov')"""
        pass
    
    @abstractmethod
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """
        Fetch grants from this data source
        
        Yields:
            Grant: Individual grant objects
        """
        pass
    
    @abstractmethod
    def validate_config(self) -> List[str]:
        """
        Validate the configuration for this data source
        
        Returns:
            List of configuration errors, empty if valid
        """
        pass
    
    def process_grants(self, **kwargs) -> ProcessingResult:
        """
        Process grants from this data source
        
        Returns:
            ProcessingResult: Summary of processing results
        """
        start_time = datetime.now()
        result = ProcessingResult(
            source=self.get_source_name(),
            total_processed=0,
            successful=0,
            failed=0
        )
        
        try:
            self.logger.info(f"Starting to process grants from {self.get_source_name()}")
            
            # Validate configuration first
            config_errors = self.validate_config()
            if config_errors:
                result.errors.extend(config_errors)
                return result
            
            # Process grants
            for grant in self.fetch_grants(**kwargs):
                result.total_processed += 1
                
                try:
                    # Validate grant data
                    validation_errors = grant.validate()
                    if validation_errors:
                        result.warnings.extend([f"Grant {grant.id}: {err}" for err in validation_errors])
                    
                    result.successful += 1
                    
                    if result.total_processed % 1000 == 0:
                        self.logger.info(f"Processed {result.total_processed} grants...")
                    
                except Exception as e:
                    result.failed += 1
                    error_msg = f"Failed to process grant {getattr(grant, 'id', 'unknown')}: {str(e)}"
                    result.errors.append(error_msg)
                    self.logger.error(error_msg)
            
            end_time = datetime.now()
            result.processing_time = (end_time - start_time).total_seconds()
            
            self.logger.info(
                f"Completed processing {result.total_processed} grants from {self.get_source_name()}. "
                f"Success: {result.successful}, Failed: {result.failed}, Time: {result.processing_time:.2f}s"
            )
            
        except Exception as e:
            result.errors.append(f"Fatal error processing {self.get_source_name()}: {str(e)}")
            self.logger.error(f"Fatal error in {self.get_source_name()}: {str(e)}")
        
        return result
    
    def get_config_value(self, key: str, default: Any = None) -> Any:
        """Get configuration value with optional default"""
        return self.config.get(key, default)
    
    def is_enabled(self) -> bool:
        """Check if this data source is enabled"""
        return self.get_config_value('enabled', True)


class FileBasedSource(DataSource):
    """Base class for file-based data sources (CSV, XML, JSON, etc.)"""
    
    def __init__(self, config: Dict[str, Any], logger: Optional[logging.Logger] = None):
        super().__init__(config, logger)
        self.file_path = config.get('file_path')
    
    def validate_config(self) -> List[str]:
        """Validate file-based source configuration"""
        errors = []
        
        if not self.file_path:
            errors.append("file_path is required for file-based sources")
        elif not self._file_exists():
            errors.append(f"File not found: {self.file_path}")
        
        return errors
    
    def _file_exists(self) -> bool:
        """Check if the source file exists"""
        try:
            from pathlib import Path
            return Path(self.file_path).exists()
        except Exception:
            return False


class APIBasedSource(DataSource):
    """Base class for API-based data sources"""
    
    def __init__(self, config: Dict[str, Any], logger: Optional[logging.Logger] = None):
        super().__init__(config, logger)
        self.base_url = config.get('base_url')
        self.api_key = config.get('api_key')
        self.rate_limit = config.get('rate_limit', 10)  # requests per second
    
    def validate_config(self) -> List[str]:
        """Validate API-based source configuration"""
        errors = []
        
        if not self.base_url:
            errors.append("base_url is required for API-based sources")
        
        # API key might not always be required
        if self.get_config_value('requires_auth', False) and not self.api_key:
            errors.append("api_key is required for authenticated APIs")
        
        return errors
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make an API request with error handling"""
        # This would be implemented by specific API sources
        # using requests library with rate limiting, retries, etc.
        raise NotImplementedError("Subclasses must implement _make_request")


class WebScrapingSource(DataSource):
    """Base class for web scraping data sources"""
    
    def __init__(self, config: Dict[str, Any], logger: Optional[logging.Logger] = None):
        super().__init__(config, logger)
        self.base_url = config.get('base_url')
        self.headers = config.get('headers', {
            'User-Agent': 'Grants Pipeline Bot 1.0'
        })
        self.delay_between_requests = config.get('delay', 1.0)
    
    def validate_config(self) -> List[str]:
        """Validate web scraping source configuration"""
        errors = []
        
        if not self.base_url:
            errors.append("base_url is required for web scraping sources")
        
        return errors
    
    def _fetch_page(self, url: str) -> str:
        """Fetch a web page with error handling"""
        # This would be implemented using requests/BeautifulSoup
        # with proper error handling, retries, and rate limiting
        raise NotImplementedError("Subclasses must implement _fetch_page")


class SourceRegistry:
    """Registry to manage available data sources"""
    
    def __init__(self):
        self._sources: Dict[str, type] = {}
    
    def register(self, source_class: type) -> None:
        """Register a data source class"""
        if not issubclass(source_class, DataSource):
            raise ValueError("Source must inherit from DataSource")
        
        # Create instance to get actual source name
        try:
            instance = source_class({})
            source_name = instance.get_source_name()
            self._sources[source_name] = source_class
        except:
            # Fallback to class name processing
            source_name = source_class.__name__.lower().replace('source', '')
            self._sources[source_name] = source_class
    
    def get_source(self, name: str) -> Optional[type]:
        """Get a registered data source class by name"""
        return self._sources.get(name.lower())
    
    def list_sources(self) -> List[str]:
        """List all registered source names"""
        return list(self._sources.keys())
    
    def create_source(self, name: str, config: Dict[str, Any], 
                     logger: Optional[logging.Logger] = None) -> Optional[DataSource]:
        """Create an instance of a data source"""
        source_class = self.get_source(name)
        if not source_class:
            return None
        
        return source_class(config, logger)


# Global source registry
registry = SourceRegistry()