#!/usr/bin/env python3
"""
Example data source template for the grants pipeline
Author: Shiloh TD

This is a template showing how to create new data sources.
Copy this file and modify it to create your own data source.
"""

from datetime import date, datetime
from typing import Iterator, List, Dict, Any
import logging

from .base import DataSource  # or FileBasedSource, APIBasedSource, WebScrapingSource
from ..core.models import Grant


class ExampleSource(DataSource):
    """
    Example data source implementation
    
    This template shows the basic structure for creating a new data source.
    Replace 'Example' with your actual source name (e.g., NSFSource, NIHSource).
    """
    
    def get_source_name(self) -> str:
        """Return the name of this data source"""
        # This should be a unique identifier for your source
        # Examples: 'nsf.gov', 'nih.gov', 'energy.gov'
        return "example.gov"
    
    def validate_config(self) -> List[str]:
        """
        Validate the configuration for this data source
        
        Returns:
            List of configuration errors, empty if valid
        """
        errors = []
        
        # Example validation checks:
        # - Required configuration parameters
        # - File paths exist
        # - API keys are present
        # - URLs are valid
        
        # Check for required config parameters
        if not self.get_config_value('api_key'):
            errors.append("api_key is required for ExampleSource")
        
        if not self.get_config_value('base_url'):
            errors.append("base_url is required for ExampleSource")
        
        return errors
    
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """
        Fetch grants from this data source
        
        Args:
            **kwargs: Additional arguments that may be passed:
                - max_records: Maximum number of records to fetch
                - future_only: Only return grants with future close dates
                - start_date: Start date for filtering
                - end_date: End date for filtering
        
        Yields:
            Grant: Individual grant objects
        """
        max_records = kwargs.get('max_records', 1000)
        future_only = kwargs.get('future_only', True)
        today = date.today()
        
        self.logger.info(f"Fetching grants from {self.get_source_name()}")
        
        # Example implementation - replace with your actual data fetching logic
        records_processed = 0
        
        try:
            # This is where you would implement your actual data fetching:
            # - Read from a file (CSV, XML, JSON)
            # - Make API calls
            # - Scrape web pages
            # - Query a database
            
            # Example: Fetch data from an API
            data = self._fetch_from_api()  # Your implementation
            
            for record in data:
                if max_records and records_processed >= max_records:
                    break
                
                try:
                    # Convert raw data to Grant object
                    grant = self._convert_to_grant(record)
                    
                    # Apply future_only filter if requested
                    if future_only and grant.close_date and grant.close_date <= today:
                        continue
                    
                    records_processed += 1
                    yield grant
                    
                except Exception as e:
                    self.logger.warning(f"Error processing record: {str(e)}")
                    continue
        
        except Exception as e:
            self.logger.error(f"Error fetching from {self.get_source_name()}: {str(e)}")
            raise
        
        self.logger.info(f"Fetched {records_processed} grants from {self.get_source_name()}")
    
    def _fetch_from_api(self) -> List[Dict[str, Any]]:
        """
        Example method to fetch data from an API
        
        Replace this with your actual data fetching implementation
        """
        # Example API fetching logic
        api_key = self.get_config_value('api_key')
        base_url = self.get_config_value('base_url')
        
        # This is where you would make HTTP requests, handle pagination, etc.
        # For now, return empty list as example
        return []
    
    def _convert_to_grant(self, record: Dict[str, Any]) -> Grant:
        """
        Convert raw data record to Grant object
        
        Args:
            record: Raw data record from your source
            
        Returns:
            Grant: Standardized Grant object
        """
        # This is where you map your source's data fields to the Grant model
        # Each source will have different field names and formats
        
        grant = Grant(
            # Required fields
            id=record.get('grant_id', ''),
            title=record.get('title', ''),
            source=self.get_source_name(),
            agency=record.get('agency', 'Unknown Agency'),
            
            # Optional fields - map as available from your source
            agency_code=record.get('agency_code'),
            opportunity_number=record.get('opportunity_number'),
            category=record.get('category', 'General'),
            status=record.get('status', 'Open'),
            
            # Funding information
            award_floor=self._parse_currency(record.get('min_award')),
            award_ceiling=self._parse_currency(record.get('max_award')),
            total_funding=self._parse_currency(record.get('total_funding')),
            expected_awards=self._parse_int(record.get('num_awards')),
            funding_instrument=record.get('funding_type', 'Grant'),
            cost_sharing=self._parse_bool(record.get('cost_share_required')),
            
            # Dates
            posted_date=self._parse_date(record.get('posted_date')),
            close_date=self._parse_date(record.get('close_date')),
            last_updated=self._parse_date(record.get('last_updated')),
            
            # Content
            description=record.get('description', ''),
            eligibility=record.get('eligibility'),
            eligibility_code=record.get('eligibility_code'),
            
            # Contact and URLs
            contact_email=record.get('contact_email'),
            url=record.get('opportunity_url'),
            
            # Classification
            cfda_number=record.get('cfda_number'),
            
            # Store any additional fields in metadata
            metadata={
                key: value for key, value in record.items()
                if key not in [
                    'grant_id', 'title', 'agency', 'agency_code',
                    'opportunity_number', 'category', 'status',
                    'min_award', 'max_award', 'total_funding',
                    'num_awards', 'funding_type', 'cost_share_required',
                    'posted_date', 'close_date', 'last_updated',
                    'description', 'eligibility', 'eligibility_code',
                    'contact_email', 'opportunity_url', 'cfda_number'
                ]
            }
        )
        
        return grant
    
    def _parse_currency(self, value: Any) -> float:
        """Parse currency values"""
        if not value:
            return None
        
        try:
            # Remove currency symbols and commas
            if isinstance(value, str):
                value = value.replace('$', '').replace(',', '').strip()
            return float(value) if value else None
        except (ValueError, TypeError):
            return None
    
    def _parse_int(self, value: Any) -> int:
        """Parse integer values"""
        if not value:
            return None
        
        try:
            return int(float(str(value))) if value else None
        except (ValueError, TypeError):
            return None
    
    def _parse_bool(self, value: Any) -> bool:
        """Parse boolean values"""
        if value is None:
            return False
        
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            return value.lower() in ['true', '1', 'yes', 'y']
        
        return bool(value)
    
    def _parse_date(self, value: Any) -> date:
        """Parse date values"""
        if not value:
            return None
        
        if isinstance(value, date):
            return value
        
        if isinstance(value, datetime):
            return value.date()
        
        if isinstance(value, str):
            # Try common date formats
            formats = [
                '%Y-%m-%d',
                '%m/%d/%Y',
                '%d/%m/%Y',
                '%Y/%m/%d',
                '%m-%d-%Y',
                '%d-%m-%Y'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt).date()
                except ValueError:
                    continue
        
        return None


# Example of different types of sources:

class ExampleFileSource(FileBasedSource):
    """Example file-based source (CSV, XML, JSON, etc.)"""
    
    def get_source_name(self) -> str:
        return "example.file"
    
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """Implement file reading logic"""
        # Read from self.file_path
        # Parse the file format
        # Yield Grant objects
        pass


class ExampleAPISource(APIBasedSource):
    """Example API-based source"""
    
    def get_source_name(self) -> str:
        return "example.api"
    
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """Implement API calling logic"""
        # Use self.base_url, self.api_key
        # Handle pagination
        # Make requests with rate limiting
        # Parse JSON responses
        # Yield Grant objects
        pass


class ExampleWebSource(WebScrapingSource):
    """Example web scraping source"""
    
    def get_source_name(self) -> str:
        return "example.web"
    
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """Implement web scraping logic"""
        # Use self.base_url
        # Fetch web pages with self._fetch_page()
        # Parse HTML with BeautifulSoup
        # Extract grant data
        # Yield Grant objects
        pass


# Don't forget to register your source!
# Add this to sources/__init__.py:
# from .your_source import YourSource
# registry.register(YourSource)