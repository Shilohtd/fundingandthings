#!/usr/bin/env python3
"""
JSON export functionality for grants data
Author: Shiloh TD
"""

import json
from datetime import date, datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

from ..core.models import Grant


class JSONExporter:
    """Exports grants data to JSON format"""
    
    def __init__(self, output_dir: str = "./output", logger: Optional[logging.Logger] = None):
        """
        Initialize JSON exporter
        
        Args:
            output_dir: Directory to save JSON files
            logger: Optional logger instance
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logger or logging.getLogger('JSONExporter')
    
    def export_grants(self, grants: List[Grant], filename: Optional[str] = None, 
                     pretty: bool = True) -> str:
        """
        Export grants to JSON file
        
        Args:
            grants: List of Grant objects to export
            filename: Output filename (auto-generated if None)
            pretty: Whether to pretty-print JSON
            
        Returns:
            Path to exported file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"grants_data_{timestamp}.json"
        
        output_path = self.output_dir / filename
        
        self.logger.info(f"Exporting {len(grants)} grants to {output_path}")
        
        # Convert grants to dictionaries
        grants_data = []
        for grant in grants:
            grant_dict = grant.to_dict()
            grants_data.append(grant_dict)
        
        # Export to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            if pretty:
                json.dump(grants_data, f, indent=2, ensure_ascii=False, default=self._json_serializer)
            else:
                json.dump(grants_data, f, ensure_ascii=False, default=self._json_serializer)
        
        self.logger.info(f"Exported {len(grants)} grants to {output_path}")
        return str(output_path)
    
    def export_single_file(self, grants: List[Grant], output_path: str, pretty: bool = True) -> None:
        """
        Export grants to a specific file path
        
        Args:
            grants: List of Grant objects
            output_path: Full path to output file
            pretty: Whether to pretty-print JSON
        """
        file_path = Path(output_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.logger.info(f"Exporting {len(grants)} grants to {file_path}")
        
        grants_data = [grant.to_dict() for grant in grants]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            if pretty:
                json.dump(grants_data, f, indent=2, ensure_ascii=False, default=self._json_serializer)
            else:
                json.dump(grants_data, f, ensure_ascii=False, default=self._json_serializer)
        
        self.logger.info(f"Exported {len(grants)} grants to {file_path}")
    
    def export_web_format(self, grants: List[Grant], output_path: str) -> None:
        """
        Export grants in format suitable for web application
        
        Args:
            grants: List of Grant objects
            output_path: Path to output file (usually grants_data.json)
        """
        file_path = Path(output_path)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.logger.info(f"Exporting {len(grants)} grants for web to {file_path}")
        
        # Convert to web-friendly format
        web_grants = []
        for grant in grants:
            web_grant = self._convert_to_web_format(grant)
            web_grants.append(web_grant)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(web_grants, f, indent=2, ensure_ascii=False, default=self._json_serializer)
        
        self.logger.info(f"Exported {len(grants)} grants for web to {file_path}")
    
    def export_by_source(self, grants: List[Grant], separate_files: bool = True) -> List[str]:
        """
        Export grants grouped by source
        
        Args:
            grants: List of Grant objects
            separate_files: Whether to create separate files per source
            
        Returns:
            List of exported file paths
        """
        # Group grants by source
        by_source = {}
        for grant in grants:
            source = grant.source
            if source not in by_source:
                by_source[source] = []
            by_source[source].append(grant)
        
        exported_files = []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if separate_files:
            # Export each source to separate file
            for source, source_grants in by_source.items():
                safe_source = source.replace('.', '_').replace('/', '_')
                filename = f"grants_{safe_source}_{timestamp}.json"
                output_path = self.export_grants(source_grants, filename)
                exported_files.append(output_path)
        else:
            # Export all sources to single file with grouping
            filename = f"grants_by_source_{timestamp}.json"
            output_path = self.output_dir / filename
            
            grouped_data = {}
            for source, source_grants in by_source.items():
                grouped_data[source] = [grant.to_dict() for grant in source_grants]
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(grouped_data, f, indent=2, ensure_ascii=False, default=self._json_serializer)
            
            exported_files.append(str(output_path))
        
        return exported_files
    
    def export_statistics(self, grants: List[Grant], filename: Optional[str] = None) -> str:
        """
        Export statistics about grants data
        
        Args:
            grants: List of Grant objects
            filename: Output filename (auto-generated if None)
            
        Returns:
            Path to exported statistics file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"grants_statistics_{timestamp}.json"
        
        output_path = self.output_dir / filename
        
        stats = self._calculate_statistics(grants)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False, default=self._json_serializer)
        
        self.logger.info(f"Exported statistics to {output_path}")
        return str(output_path)
    
    def _convert_to_web_format(self, grant: Grant) -> Dict[str, Any]:
        """Convert Grant to web-friendly format"""
        web_grant = {
            'id': grant.id,
            'title': grant.title,
            'agency': grant.agency,
            'description': grant.description,
            'source': grant.source,
            'category': grant.category,
            'status': grant.status,
            'award_floor': grant.award_floor,
            'award_ceiling': grant.award_ceiling,
            'posted_date': grant.posted_date.isoformat() if grant.posted_date else None,
            'close_date': grant.close_date.isoformat() if grant.close_date else None,
            'url': grant.url,
            'eligibility': grant.eligibility,
            'cfda_number': grant.cfda_number,
            'funding_instrument': grant.funding_instrument,
            'expected_awards': grant.expected_awards,
            'cost_sharing': grant.cost_sharing,
            'total_funding': grant.total_funding,
            'opportunity_number': grant.opportunity_number,
            'agency_code': grant.agency_code,
            'contact_email': grant.contact_email,
            'eligibility_code': grant.eligibility_code,
            'metadata': grant.metadata
        }
        
        return web_grant
    
    def _calculate_statistics(self, grants: List[Grant]) -> Dict[str, Any]:
        """Calculate statistics from grants data"""
        total_grants = len(grants)
        
        # Group by source
        by_source = {}
        by_agency = {}
        by_category = {}
        by_status = {}
        by_funding_instrument = {}
        
        total_funding = 0
        open_grants = 0
        
        for grant in grants:
            # By source
            by_source[grant.source] = by_source.get(grant.source, 0) + 1
            
            # By agency
            by_agency[grant.agency] = by_agency.get(grant.agency, 0) + 1
            
            # By category
            by_category[grant.category] = by_category.get(grant.category, 0) + 1
            
            # By status
            by_status[grant.status] = by_status.get(grant.status, 0) + 1
            
            # By funding instrument
            by_funding_instrument[grant.funding_instrument] = by_funding_instrument.get(grant.funding_instrument, 0) + 1
            
            # Calculate totals
            if grant.total_funding:
                total_funding += grant.total_funding
            elif grant.award_ceiling and grant.expected_awards:
                total_funding += grant.award_ceiling * grant.expected_awards
            elif grant.award_ceiling:
                total_funding += grant.award_ceiling
            
            if grant.is_open():
                open_grants += 1
        
        # Funding ranges
        funding_ranges = {
            'under_100k': 0,
            '100k_500k': 0,
            '500k_1m': 0,
            '1m_5m': 0,
            '5m_10m': 0,
            'over_10m': 0,
            'unspecified': 0
        }
        
        for grant in grants:
            ceiling = grant.award_ceiling
            if not ceiling:
                funding_ranges['unspecified'] += 1
            elif ceiling < 100000:
                funding_ranges['under_100k'] += 1
            elif ceiling < 500000:
                funding_ranges['100k_500k'] += 1
            elif ceiling < 1000000:
                funding_ranges['500k_1m'] += 1
            elif ceiling < 5000000:
                funding_ranges['1m_5m'] += 1
            elif ceiling < 10000000:
                funding_ranges['5m_10m'] += 1
            else:
                funding_ranges['over_10m'] += 1
        
        return {
            'summary': {
                'total_grants': total_grants,
                'open_grants': open_grants,
                'total_estimated_funding': total_funding,
                'unique_agencies': len(by_agency),
                'unique_sources': len(by_source)
            },
            'by_source': dict(sorted(by_source.items(), key=lambda x: x[1], reverse=True)),
            'by_agency': dict(sorted(by_agency.items(), key=lambda x: x[1], reverse=True)[:20]),  # Top 20
            'by_category': dict(sorted(by_category.items(), key=lambda x: x[1], reverse=True)),
            'by_status': dict(sorted(by_status.items(), key=lambda x: x[1], reverse=True)),
            'by_funding_instrument': dict(sorted(by_funding_instrument.items(), key=lambda x: x[1], reverse=True)),
            'funding_ranges': funding_ranges,
            'generated_at': datetime.now().isoformat()
        }
    
    @staticmethod
    def _json_serializer(obj):
        """JSON serializer for dates"""
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        raise TypeError(f"Object {obj} is not JSON serializable")