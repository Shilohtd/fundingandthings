#!/usr/bin/env python3
"""
Automated Grants Database Updater
Downloads latest XML extract from Grants.gov, processes it, and updates the website
"""
import os
import sys
import logging
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from grants_pipeline.main import main as pipeline_main

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('auto_update.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class GrantsDatabaseUpdater:
    """
    Automated updater for the grants database
    """
    
    def __init__(self, config_path: str = "config.yaml", 
                 repo_path: str = "./fundingandthings",
                 deploy_to_git: bool = True):
        self.config_path = config_path
        self.repo_path = repo_path
        self.deploy_to_git = deploy_to_git
        
    def update_config_for_xml(self):
        """
        Update the configuration to include XML source
        """
        import yaml
        
        try:
            # Read existing config
            with open(self.config_path, 'r') as f:
                config = yaml.safe_load(f)
            
            # Add XML source if not already present
            xml_source_config = {
                'name': 'grants.gov_xml',
                'enabled': True,
                'download_dir': './downloads',
                'keep_downloaded_files': False
            }
            
            # Check if XML source already exists
            xml_exists = False
            if 'sources' in config:
                for source in config['sources']:
                    if source.get('name') == 'grants.gov_xml':
                        xml_exists = True
                        break
            
            if not xml_exists:
                if 'sources' not in config:
                    config['sources'] = []
                config['sources'].append(xml_source_config)
                
                # Write updated config
                with open(self.config_path, 'w') as f:
                    yaml.dump(config, f, default_flow_style=False)
                
                logger.info("Added XML source to configuration")
            else:
                logger.info("XML source already in configuration")
                
        except Exception as e:
            logger.error(f"Error updating config: {e}")
            raise
    
    def run_pipeline(self):
        """
        Run the grants pipeline to process all sources
        """
        try:
            logger.info("Running grants pipeline")
            
            # Run pipeline with XML output to repo directory
            args = [
                'run',
                '--config', self.config_path,
                '--web-output', os.path.join(self.repo_path, 'web')
            ]
            
            # This will run the pipeline and update the data
            pipeline_main(args)
            
            logger.info("Pipeline completed successfully")
            
        except Exception as e:
            logger.error(f"Error running pipeline: {e}")
            raise
    
    def copy_data_to_repo(self):
        """
        Copy the generated data files to the repository
        """
        try:
            import shutil
            
            # Copy web data to repo root
            web_data_source = os.path.join(self.repo_path, 'web', 'grants_data.json')
            web_data_dest = os.path.join(self.repo_path, 'grants_data.json')
            
            if os.path.exists(web_data_source):
                shutil.copy2(web_data_source, web_data_dest)
                logger.info(f"Copied web data to {web_data_dest}")
            else:
                logger.warning(f"Web data file not found at {web_data_source}")
                
        except Exception as e:
            logger.error(f"Error copying data to repo: {e}")
            raise
    
    def deploy_to_github(self):
        """
        Deploy updated data to GitHub
        """
        if not self.deploy_to_git:
            logger.info("Git deployment disabled")
            return
            
        try:
            os.chdir(self.repo_path)
            
            # Check if there are changes
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True)
            
            if not result.stdout.strip():
                logger.info("No changes to commit")
                return
            
            # Add changes
            subprocess.run(['git', 'add', '.'], check=True)
            
            # Commit with timestamp
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            commit_message = f"""Automated update from Grants.gov XML extract

Updated: {timestamp}
Source: Latest XML database extract from grants.gov

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"""
            
            subprocess.run(['git', 'commit', '-m', commit_message], check=True)
            
            # Push to remote
            subprocess.run(['git', 'push'], check=True)
            
            logger.info("Successfully deployed to GitHub")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Git command failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Error deploying to GitHub: {e}")
            raise
    
    def run_update(self):
        """
        Run the complete update process
        """
        logger.info("Starting automated grants database update")
        
        try:
            # Step 1: Update configuration
            self.update_config_for_xml()
            
            # Step 2: Run pipeline
            self.run_pipeline()
            
            # Step 3: Copy data to repo
            self.copy_data_to_repo()
            
            # Step 4: Deploy to GitHub
            self.deploy_to_github()
            
            logger.info("Automated update completed successfully!")
            
        except Exception as e:
            logger.error(f"Update failed: {e}")
            return False
        
        return True

def main():
    parser = argparse.ArgumentParser(description='Automated Grants Database Updater')
    parser.add_argument('--config', default='config.yaml', 
                       help='Path to configuration file')
    parser.add_argument('--repo', default='./fundingandthings',
                       help='Path to git repository')
    parser.add_argument('--no-git', action='store_true',
                       help='Skip git deployment')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    updater = GrantsDatabaseUpdater(
        config_path=args.config,
        repo_path=args.repo,
        deploy_to_git=not args.no_git
    )
    
    success = updater.run_update()
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()