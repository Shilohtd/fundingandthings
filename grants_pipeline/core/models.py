#!/usr/bin/env python3
"""
Core data models for the grants pipeline
Author: Shiloh TD
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List
from datetime import datetime, date
import json


@dataclass
class Grant:
    """Standardized grant data structure used across all data sources"""
    
    # Core identifiers
    id: str
    title: str
    source: str  # e.g., "grants.gov", "nsf.gov", "nih.gov"
    
    # Organization info
    agency: str
    agency_code: Optional[str] = None
    
    # Opportunity details
    opportunity_number: Optional[str] = None
    category: str = "General"
    status: str = "Open"
    
    # Funding information
    award_floor: Optional[float] = None
    award_ceiling: Optional[float] = None
    total_funding: Optional[float] = None
    expected_awards: Optional[int] = None
    funding_instrument: str = "Grant"  # Grant, Cooperative Agreement, etc.
    cost_sharing: bool = False
    
    # Dates
    posted_date: Optional[date] = None
    close_date: Optional[date] = None
    last_updated: Optional[date] = None
    
    # Content
    description: str = ""
    
    # Eligibility
    eligibility: Optional[str] = None
    eligibility_code: Optional[str] = None
    
    # Contact and URLs
    contact_email: Optional[str] = None
    url: Optional[str] = None
    
    # Classification
    cfda_number: Optional[str] = None
    
    # Additional metadata (source-specific fields)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate and normalize data after initialization"""
        # Ensure dates are date objects
        if isinstance(self.posted_date, str):
            self.posted_date = self._parse_date(self.posted_date)
        if isinstance(self.close_date, str):
            self.close_date = self._parse_date(self.close_date)
        if isinstance(self.last_updated, str):
            self.last_updated = self._parse_date(self.last_updated)
    
    @staticmethod
    def _parse_date(date_str: str) -> Optional[date]:
        """Parse various date formats to date object"""
        if not date_str:
            return None
        
        formats = [
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%m-%d-%Y',
            '%Y/%m/%d',
            '%d/%m/%Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        
        # Convert dates to strings
        if data['posted_date']:
            data['posted_date'] = data['posted_date'].isoformat()
        if data['close_date']:
            data['close_date'] = data['close_date'].isoformat()
        if data['last_updated']:
            data['last_updated'] = data['last_updated'].isoformat()
        
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Grant':
        """Create Grant from dictionary"""
        # Handle date strings
        if 'posted_date' in data and data['posted_date']:
            data['posted_date'] = cls._parse_date(data['posted_date'])
        if 'close_date' in data and data['close_date']:
            data['close_date'] = cls._parse_date(data['close_date'])
        if 'last_updated' in data and data['last_updated']:
            data['last_updated'] = cls._parse_date(data['last_updated'])
        
        return cls(**data)
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=2, default=str)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Grant':
        """Create Grant from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def is_open(self) -> bool:
        """Check if grant is currently open for applications"""
        if not self.close_date:
            return self.status.lower() == 'open'
        
        today = date.today()
        return self.close_date > today and self.status.lower() == 'open'
    
    def days_until_close(self) -> Optional[int]:
        """Get number of days until close date"""
        if not self.close_date:
            return None
        
        today = date.today()
        delta = self.close_date - today
        return delta.days
    
    def validate(self) -> List[str]:
        """Validate grant data and return list of errors"""
        errors = []
        
        if not self.id:
            errors.append("Grant ID is required")
        if not self.title:
            errors.append("Grant title is required")
        if not self.source:
            errors.append("Grant source is required")
        if not self.agency:
            errors.append("Grant agency is required")
        
        # Validate funding amounts
        if self.award_floor is not None and self.award_ceiling is not None:
            if self.award_floor > self.award_ceiling:
                errors.append("Award floor cannot be greater than award ceiling")
        
        # Validate dates
        if self.posted_date and self.close_date:
            if self.posted_date > self.close_date:
                errors.append("Posted date cannot be after close date")
        
        return errors


@dataclass
class ProcessingResult:
    """Result of processing grants data"""
    
    source: str
    total_processed: int
    successful: int
    failed: int
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    processing_time: float = 0.0
    
    def success_rate(self) -> float:
        """Calculate success rate as percentage"""
        if self.total_processed == 0:
            return 0.0
        return (self.successful / self.total_processed) * 100.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class SourceConfig:
    """Configuration for a data source"""
    
    name: str
    enabled: bool = True
    update_frequency: str = "daily"  # daily, weekly, monthly
    source_class: str = ""  # Full class path
    config: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)