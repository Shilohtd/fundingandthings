#!/usr/bin/env python3
"""
Grants.gov data source implementation
Author: Shiloh TD
"""

import csv
from datetime import datetime, date
from pathlib import Path
from typing import Iterator, List, Dict, Any
import logging

from .base import FileBasedSource
from ..core.models import Grant


class GrantsGovSource(FileBasedSource):
    """Data source for Grants.gov CSV files"""
    
    def get_source_name(self) -> str:
        """Return the name of this data source"""
        return "grants.gov"
    
    def validate_config(self) -> List[str]:
        """Validate Grants.gov specific configuration"""
        errors = super().validate_config()
        
        # Check if file is CSV
        if self.file_path and not self.file_path.endswith('.csv'):
            errors.append("Grants.gov source requires a CSV file")
        
        return errors
    
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """
        Fetch grants from Grants.gov CSV file
        
        Kwargs:
            future_only: bool - Only return grants with future close dates (default: True)
            max_records: int - Maximum number of records to process (default: unlimited)
        """
        future_only = kwargs.get('future_only', True)
        max_records = kwargs.get('max_records', None)
        today = date.today()
        records_processed = 0
        
        self.logger.info(f"Loading grants from CSV: {self.file_path}")
        
        try:
            with open(self.file_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f)
                
                for row_num, row in enumerate(reader, 1):
                    if max_records and records_processed >= max_records:
                        break
                    
                    try:
                        grant = self._parse_csv_row(row)
                        
                        # Skip if future_only and grant is closed
                        if future_only and grant.close_date and grant.close_date <= today:
                            continue
                        
                        records_processed += 1
                        yield grant
                        
                    except Exception as e:
                        self.logger.warning(f"Error processing row {row_num}: {str(e)}")
                        continue
        
        except Exception as e:
            self.logger.error(f"Error reading CSV file: {str(e)}")
            raise
    
    def _parse_csv_row(self, row: Dict[str, str]) -> Grant:
        """Parse a single CSV row into a Grant object"""
        
        # Parse dates
        close_date_str = self._parse_grant_date(row.get('close_date'))
        post_date_str = self._parse_grant_date(row.get('post_date'))
        updated_date_str = self._parse_grant_date(row.get('last_updated_date'))
        
        # Determine status based on dates
        status = "Open"
        if post_date_str:
            try:
                post_date = datetime.strptime(post_date_str, '%Y-%m-%d').date()
                if post_date > date.today():
                    status = "Forecasted"
            except ValueError:
                pass
        
        # Map funding instrument types
        funding_type_map = {
            'G': 'Grant',
            'CA': 'Cooperative Agreement', 
            'PC': 'Procurement Contract',
            'O': 'Other'
        }
        funding_instrument = funding_type_map.get(
            row.get('funding_instrument_type', '').strip(),
            'Grant'
        )
        
        # Map categories
        category_map = {
            'D': 'Discretionary',
            'M': 'Mandatory',
            'C': 'Continuation',
            'E': 'Earmark',
            'O': 'Other'
        }
        category = category_map.get(
            row.get('opportunity_category', '').strip(),
            'General'
        )
        
        # Parse numeric values safely
        award_floor = self._safe_float(row.get('award_floor'))
        award_ceiling = self._safe_float(row.get('award_ceiling'))
        total_funding = self._safe_float(row.get('estimated_total_program_funding'))
        expected_awards = self._safe_int(row.get('expected_number_of_awards'))
        
        # Create grant object
        grant = Grant(
            id=self._clean_text(row.get('opportunity_id', '')),
            title=self._clean_text(row.get('opportunity_title', 'Untitled Grant')),
            source=self.get_source_name(),
            agency=self._clean_text(row.get('agency_name', 'Unknown Agency')),
            agency_code=self._clean_text(row.get('agency_code')),
            opportunity_number=self._clean_text(row.get('opportunity_number')),
            category=category,
            status=status,
            award_floor=award_floor,
            award_ceiling=award_ceiling,
            total_funding=total_funding,
            expected_awards=expected_awards,
            funding_instrument=funding_instrument,
            cost_sharing=str(row.get('cost_sharing_requirement', '')).strip().upper() == 'YES',
            posted_date=datetime.strptime(post_date_str, '%Y-%m-%d').date() if post_date_str else None,
            close_date=datetime.strptime(close_date_str, '%Y-%m-%d').date() if close_date_str else None,
            last_updated=datetime.strptime(updated_date_str, '%Y-%m-%d').date() if updated_date_str else None,
            description=self._clean_text(row.get('description', ''))[:500],
            eligibility=self._clean_text(row.get('additional_eligibility_info')),
            eligibility_code=self._clean_text(row.get('eligible_applicants')),
            contact_email=self._clean_text(row.get('grantor_contact_email')),
            url=self._clean_text(row.get('additional_info_url')),
            cfda_number=self._clean_text(row.get('cfda_numbers')),
            metadata={
                'category_of_funding_activity': self._clean_text(row.get('category_of_funding_activity')),
                'version': self._clean_text(row.get('version')),
                'grantor_contact_text': self._clean_text(row.get('grantor_contact_text'))
            }
        )
        
        return grant
    
    def _parse_grant_date(self, date_value: str) -> str:
        """Parse date from CSV format (MDDYYYY or MMDDYYYY) to ISO format"""
        if not date_value:
            return None
        
        date_str = str(date_value).strip()
        if not date_str or date_str == '0':
            return None
        
        try:
            # Handle various date formats
            if date_str.isdigit():
                if len(date_str) == 7:
                    # MDDYYYY
                    month = int(date_str[0])
                    day = int(date_str[1:3])
                    year = int(date_str[3:7])
                elif len(date_str) == 8:
                    # MMDDYYYY
                    month = int(date_str[0:2])
                    day = int(date_str[2:4])
                    year = int(date_str[4:8])
                else:
                    return None
            else:
                # Try parsing as standard date format
                for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%Y/%m/%d']:
                    try:
                        date_obj = datetime.strptime(date_str, fmt)
                        return date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
                return None
            
            # Validate date components
            if not (1 <= month <= 12 and 1 <= day <= 31 and 2020 <= year <= 2030):
                return None
            
            # Create date and format as ISO string
            date_obj = datetime(year, month, day)
            return date_obj.strftime('%Y-%m-%d')
            
        except (ValueError, IndexError, AttributeError):
            return None
    
    def _safe_float(self, val: str) -> float:
        """Safely parse numeric values"""
        try:
            cleaned = str(val).replace(',', '').replace('$', '').strip()
            return float(cleaned) if cleaned and cleaned != '0' else None
        except (ValueError, TypeError, AttributeError):
            return None
    
    def _safe_int(self, val: str) -> int:
        """Safely parse integer values"""
        try:
            cleaned = str(val).replace(',', '').strip()
            return int(float(cleaned)) if cleaned and cleaned != '0' else None
        except (ValueError, TypeError, AttributeError):
            return None
    
    def _clean_text(self, val: str) -> str:
        """Clean text fields"""
        if not val:
            return ''
        text = str(val).strip()
        return text if text and text.lower() != 'nan' else ''


class GrantsGovXMLSource(FileBasedSource):
    """Data source for Grants.gov XML files"""
    
    def get_source_name(self) -> str:
        return "grants.gov.xml"
    
    def validate_config(self) -> List[str]:
        errors = super().validate_config()
        
        if self.file_path and not self.file_path.endswith('.xml'):
            errors.append("Grants.gov XML source requires an XML file")
        
        return errors
    
    def fetch_grants(self, **kwargs) -> Iterator[Grant]:
        """Fetch grants from Grants.gov XML file"""
        try:
            import xml.etree.ElementTree as ET
        except ImportError:
            raise ImportError("xml.etree.ElementTree required for XML processing")
        
        max_records = kwargs.get('max_records', 10000)
        future_only = kwargs.get('future_only', True)
        today = date.today()
        
        self.logger.info(f"Loading grants from XML: {self.file_path}")
        
        try:
            tree = ET.parse(self.file_path)
            root = tree.getroot()
            
            # XML namespace
            namespace = "http://apply.grants.gov/system/OpportunityDetail-V1.0"
            ns_prefix = f"{{{namespace}}}"
            
            # Find all grant opportunities
            opportunities = root.findall(f".//{ns_prefix}OpportunitySynopsisDetail_1_0")
            self.logger.info(f"Found {len(opportunities)} opportunities in XML")
            
            records_processed = 0
            
            for opportunity in opportunities:
                if max_records and records_processed >= max_records:
                    break
                
                try:
                    grant = self._parse_xml_opportunity(opportunity, ns_prefix)
                    
                    # Skip if future_only and grant is closed
                    if future_only and grant.close_date and grant.close_date <= today:
                        continue
                    
                    records_processed += 1
                    yield grant
                    
                except Exception as e:
                    self.logger.warning(f"Error processing XML opportunity: {str(e)}")
                    continue
        
        except Exception as e:
            self.logger.error(f"Error reading XML file: {str(e)}")
            raise
    
    def _parse_xml_opportunity(self, opportunity, ns_prefix: str) -> Grant:
        """Parse XML opportunity element into Grant object"""
        
        def get_text(tag_name: str) -> str:
            """Get text content from XML element"""
            element = opportunity.find(f"{ns_prefix}{tag_name}")
            return element.text.strip() if element is not None and element.text else ""
        
        # Map XML tags to values
        opportunity_id = get_text('OpportunityID')
        title = get_text('OpportunityTitle') or 'Untitled Grant'
        agency = get_text('AgencyName') or 'Unknown Agency'
        description = get_text('Description')[:500] if get_text('Description') else ""
        
        # Parse dates
        close_date_str = self._parse_xml_date(get_text('CloseDate'))
        post_date_str = self._parse_xml_date(get_text('PostDate'))
        updated_date_str = self._parse_xml_date(get_text('LastUpdatedDate'))
        
        # Parse funding amounts
        award_ceiling = self._safe_float(get_text('AwardCeiling'))
        award_floor = self._safe_float(get_text('AwardFloor'))
        total_funding = self._safe_float(get_text('EstimatedTotalProgramFunding'))
        expected_awards = self._safe_int(get_text('ExpectedNumberOfAwards'))
        
        # Create Grant object
        grant = Grant(
            id=opportunity_id,
            title=title,
            source=self.get_source_name(),
            agency=agency,
            agency_code=get_text('AgencyCode'),
            opportunity_number=get_text('OpportunityNumber'),
            category=self._map_category(get_text('OpportunityCategory')),
            status="Open",  # Assume open unless determined otherwise
            award_floor=award_floor,
            award_ceiling=award_ceiling,
            total_funding=total_funding,
            expected_awards=expected_awards,
            funding_instrument=self._map_funding_instrument(get_text('FundingInstrumentType')),
            cost_sharing=get_text('CostSharingOrMatchingRequirement').upper() == 'YES',
            posted_date=datetime.strptime(post_date_str, '%Y-%m-%d').date() if post_date_str else None,
            close_date=datetime.strptime(close_date_str, '%Y-%m-%d').date() if close_date_str else None,
            last_updated=datetime.strptime(updated_date_str, '%Y-%m-%d').date() if updated_date_str else None,
            description=description,
            eligibility=get_text('AdditionalInformationOnEligibility'),
            eligibility_code=get_text('EligibleApplicants'),
            contact_email=get_text('GrantorContactEmail'),
            url=get_text('AdditionalInformationURL'),
            cfda_number=get_text('CFDANumbers'),
            metadata={
                'version': get_text('Version'),
                'category_explanation': get_text('CategoryExplanation'),
                'grantor_contact_text': get_text('GrantorContactText')
            }
        )
        
        return grant
    
    def _parse_xml_date(self, date_str: str) -> str:
        """Parse XML date format (MMDDYYYY) to ISO format"""
        if not date_str or len(date_str) != 8:
            return None
        
        try:
            month = int(date_str[:2])
            day = int(date_str[2:4])
            year = int(date_str[4:])
            
            date_obj = datetime(year, month, day)
            return date_obj.strftime('%Y-%m-%d')
        except (ValueError, IndexError):
            return None
    
    def _map_category(self, category_code: str) -> str:
        """Map XML category codes to readable names"""
        mapping = {
            'D': 'Discretionary',
            'M': 'Mandatory',
            'C': 'Continuation',
            'E': 'Earmark',
            'O': 'Other'
        }
        return mapping.get(category_code, 'General')
    
    def _map_funding_instrument(self, instrument_code: str) -> str:
        """Map XML funding instrument codes to readable names"""
        mapping = {
            'G': 'Grant',
            'CA': 'Cooperative Agreement',
            'PC': 'Procurement Contract',
            'O': 'Other'
        }
        return mapping.get(instrument_code, 'Grant')
    
    def _safe_float(self, val: str) -> float:
        """Safely parse numeric values"""
        try:
            cleaned = str(val).replace(',', '').replace('$', '').strip()
            return float(cleaned) if cleaned and cleaned != '0' else None
        except (ValueError, TypeError, AttributeError):
            return None
    
    def _safe_int(self, val: str) -> int:
        """Safely parse integer values"""
        try:
            cleaned = str(val).replace(',', '').strip()
            return int(float(cleaned)) if cleaned and cleaned != '0' else None
        except (ValueError, TypeError, AttributeError):
            return None