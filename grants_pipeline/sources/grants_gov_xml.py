"""
Grants.gov XML Data Source
Downloads and processes the latest XML database extract from grants.gov
"""
import os
import re
import zipfile
import logging
import tempfile
import requests
from datetime import datetime
from typing import List, Optional, Dict, Any
from xml.etree import ElementTree as ET
from bs4 import BeautifulSoup

from .base import DataSource
from ..core.models import Grant

logger = logging.getLogger(__name__)

class GrantsGovXMLSource(DataSource):
    """Data source for Grants.gov XML database extracts"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.xml_extract_url = "https://grants.gov/xml-extract"
        self.base_download_url = "https://prod-grants-gov-chatbot.s3.amazonaws.com/extracts/"
        self.download_dir = config.get('download_dir', './downloads')
        self.keep_files = config.get('keep_downloaded_files', False)
        
        # Ensure download directory exists
        os.makedirs(self.download_dir, exist_ok=True)
    
    def get_source_name(self) -> str:
        return "grants.gov_xml"
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validate the configuration for this source"""
        # XML source doesn't require specific config validation
        return True
    
    def get_latest_extract_info(self) -> Optional[Dict[str, str]]:
        """
        Scrape the XML extract page to find the most recent ZIP file
        Returns dict with filename, url, date, and size
        """
        try:
            logger.info("Fetching latest extract information from grants.gov")
            response = requests.get(self.xml_extract_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for links to ZIP files with the GrantsDBExtract pattern
            zip_links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                if 'GrantsDBExtract' in href and href.endswith('.zip'):
                    # Extract filename from URL
                    filename = href.split('/')[-1]
                    
                    # Look for date and size info nearby
                    parent = link.parent
                    text = parent.get_text() if parent else ""
                    
                    zip_links.append({
                        'filename': filename,
                        'url': href,
                        'text': text
                    })
            
            if not zip_links:
                logger.error("No ZIP files found on the extract page")
                return None
            
            # Sort by filename to get the most recent (assumes YYYYMMDD format)
            zip_links.sort(key=lambda x: x['filename'], reverse=True)
            latest = zip_links[0]
            
            logger.info(f"Found latest extract: {latest['filename']}")
            return latest
            
        except Exception as e:
            logger.error(f"Error fetching latest extract info: {e}")
            return None
    
    def download_extract(self, extract_info: Dict[str, str]) -> Optional[str]:
        """
        Download the ZIP file and return the local path
        """
        filename = extract_info['filename']
        url = extract_info['url']
        local_path = os.path.join(self.download_dir, filename)
        
        # Check if already downloaded
        if os.path.exists(local_path):
            logger.info(f"Extract already downloaded: {local_path}")
            return local_path
        
        try:
            logger.info(f"Downloading {filename} from {url}")
            response = requests.get(url, timeout=300, stream=True)
            response.raise_for_status()
            
            # Download with progress
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # Log progress every 10MB
                        if downloaded % (10 * 1024 * 1024) == 0:
                            progress = (downloaded / total_size * 100) if total_size > 0 else 0
                            logger.info(f"Download progress: {progress:.1f}%")
            
            logger.info(f"Download completed: {local_path}")
            return local_path
            
        except Exception as e:
            logger.error(f"Error downloading extract: {e}")
            # Clean up partial download
            if os.path.exists(local_path):
                os.remove(local_path)
            return None
    
    def extract_zip(self, zip_path: str) -> Optional[str]:
        """
        Extract the ZIP file and return the directory containing XML files
        """
        extract_dir = zip_path.replace('.zip', '_extracted')
        
        # Check if already extracted
        if os.path.exists(extract_dir):
            logger.info(f"Already extracted: {extract_dir}")
            return extract_dir
        
        try:
            logger.info(f"Extracting {zip_path}")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            logger.info(f"Extraction completed: {extract_dir}")
            return extract_dir
            
        except Exception as e:
            logger.error(f"Error extracting ZIP file: {e}")
            return None
    
    def parse_xml_files(self, extract_dir: str) -> List[Grant]:
        """
        Parse XML files in the extracted directory and convert to Grant objects
        """
        grants = []
        
        try:
            # Look for XML files
            xml_files = []
            for root, dirs, files in os.walk(extract_dir):
                for file in files:
                    if file.endswith('.xml'):
                        xml_files.append(os.path.join(root, file))
            
            logger.info(f"Found {len(xml_files)} XML files to process")
            
            for xml_file in xml_files:
                try:
                    file_grants = self.parse_single_xml(xml_file)
                    grants.extend(file_grants)
                    
                    if len(grants) % 100 == 0:
                        logger.info(f"Processed {len(grants)} grants so far...")
                        
                except Exception as e:
                    logger.error(f"Error parsing {xml_file}: {e}")
                    continue
            
            logger.info(f"Successfully parsed {len(grants)} grants from XML files")
            return grants
            
        except Exception as e:
            logger.error(f"Error parsing XML files: {e}")
            return []
    
    def parse_single_xml(self, xml_file: str) -> List[Grant]:
        """
        Parse a single XML file and extract grant data
        """
        grants = []
        
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
            
            # Handle different XML structures - adjust based on actual XML format
            # This is a generic parser that will need adjustment based on the real XML structure
            for opportunity in root.findall('.//OpportunityDetail') or root.findall('.//Opportunity') or [root]:
                try:
                    grant = self.parse_opportunity_xml(opportunity)
                    if grant:
                        grants.append(grant)
                except Exception as e:
                    logger.debug(f"Error parsing opportunity in {xml_file}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error parsing XML file {xml_file}: {e}")
        
        return grants
    
    def parse_opportunity_xml(self, opportunity_elem) -> Optional[Grant]:
        """
        Parse a single opportunity XML element into a Grant object
        """
        try:
            # Helper function to safely get text from XML element
            def get_text(path: str, default: str = None) -> Optional[str]:
                elem = opportunity_elem.find(path)
                return elem.text.strip() if elem is not None and elem.text else default
            
            def get_number(path: str, default: float = None) -> Optional[float]:
                text = get_text(path)
                if text:
                    try:
                        # Remove currency symbols and commas
                        cleaned = re.sub(r'[,$]', '', text)
                        return float(cleaned)
                    except ValueError:
                        pass
                return default
            
            def parse_date(date_str: str) -> Optional[str]:
                if not date_str:
                    return None
                try:
                    # Try common date formats
                    for fmt in ['%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y', '%Y/%m/%d']:
                        try:
                            dt = datetime.strptime(date_str.strip(), fmt)
                            return dt.strftime('%Y-%m-%d')
                        except ValueError:
                            continue
                    return date_str  # Return as-is if can't parse
                except:
                    return None
            
            # Extract basic information - adjust field names based on actual XML structure
            opportunity_id = get_text('.//OpportunityID') or get_text('.//OpportunityNumber') or get_text('.//ID')
            title = get_text('.//OpportunityTitle') or get_text('.//Title')
            agency = get_text('.//AgencyName') or get_text('.//Agency')
            description = get_text('.//Description') or get_text('.//Synopsis')
            
            # Skip if missing critical fields
            if not opportunity_id or not title:
                return None
            
            # Extract other fields
            category = get_text('.//OpportunityCategory') or get_text('.//Category', 'Discretionary')
            status = get_text('.//Status', 'Unknown')
            funding_instrument = get_text('.//FundingInstrumentType') or get_text('.//InstrumentType')
            
            # Extract funding amounts
            award_ceiling = get_number('.//AwardCeiling') or get_number('.//MaxAward')
            award_floor = get_number('.//AwardFloor') or get_number('.//MinAward')
            estimated_funding = get_number('.//EstimatedTotalProgramFunding') or get_number('.//TotalFunding')
            
            # Extract dates
            post_date_str = get_text('.//PostDate') or get_text('.//PostedDate')
            close_date_str = get_text('.//CloseDate') or get_text('.//ApplicationDueDate')
            archive_date_str = get_text('.//ArchiveDate')
            
            # Extract additional fields
            cost_sharing = get_text('.//CostSharingRequired')
            cfda_number = get_text('.//CFDANumber') or get_text('.//CFDA')
            version = get_text('.//Version', '1')
            
            # Create Grant object
            grant = Grant(
                id=opportunity_id,
                title=title,
                agency=agency or 'Unknown Agency',
                description=description or '',
                source=self.get_source_name(),
                category=category,
                status=status,
                funding_instrument=funding_instrument,
                award_ceiling=award_ceiling,
                award_floor=award_floor,
                estimated_total_funding=estimated_funding,
                post_date=parse_date(post_date_str),
                close_date=parse_date(close_date_str),
                archive_date=parse_date(archive_date_str),
                cost_sharing_required=cost_sharing,
                cfda_number=cfda_number,
                version=version
            )
            
            return grant
            
        except Exception as e:
            logger.debug(f"Error parsing opportunity XML: {e}")
            return None
    
    def fetch_grants(self) -> List[Grant]:
        """
        Main method to fetch grants from the XML extract
        """
        logger.info("Starting Grants.gov XML data fetch")
        
        # Get latest extract info
        extract_info = self.get_latest_extract_info()
        if not extract_info:
            logger.error("Could not find latest extract information")
            return []
        
        # Download the ZIP file
        zip_path = self.download_extract(extract_info)
        if not zip_path:
            logger.error("Could not download extract")
            return []
        
        # Extract the ZIP file
        extract_dir = self.extract_zip(zip_path)
        if not extract_dir:
            logger.error("Could not extract ZIP file")
            return []
        
        # Parse XML files
        grants = self.parse_xml_files(extract_dir)
        
        # Cleanup if requested
        if not self.keep_files:
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                    logger.info(f"Removed downloaded file: {zip_path}")
                
                import shutil
                if os.path.exists(extract_dir):
                    shutil.rmtree(extract_dir)
                    logger.info(f"Removed extracted directory: {extract_dir}")
            except Exception as e:
                logger.warning(f"Could not cleanup files: {e}")
        
        logger.info(f"XML fetch completed. Retrieved {len(grants)} grants")
        return grants