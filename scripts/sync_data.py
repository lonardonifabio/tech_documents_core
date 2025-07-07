#!/usr/bin/env python3
"""
Data synchronization script for local development
Ensures local data is synchronized with the public repository (source of truth)
"""

import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataSynchronizer:
    """Synchronizes local data with public repository"""
    
    def __init__(self):
        self.base_dir = Path.cwd()
        self.data_dir = self.base_dir / 'data'
        self.public_repo_url = 'https://github.com/lonardonifabio/tech_documents.git'
        
    def fetch_public_data(self) -> bool:
        """Fetch latest data from public repository"""
        try:
            logger.info("🔄 Fetching latest data from public repository...")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Clone public repository
                result = subprocess.run([
                    'git', 'clone', '--depth=1', self.public_repo_url, str(temp_path / 'public_repo')
                ], capture_output=True, text=True)
                
                if result.returncode != 0:
                    logger.error(f"Failed to clone public repository: {result.stderr}")
                    return False
                
                public_data_dir = temp_path / 'public_repo' / 'data'
                
                if not public_data_dir.exists():
                    logger.warning("No data directory found in public repository")
                    return False
                
                # Ensure local data directory exists
                self.data_dir.mkdir(exist_ok=True)
                
                # Synchronize data files with timestamp protection
                self.sync_file_with_protection(
                    public_data_dir / 'documents.json',
                    self.data_dir / 'documents.json',
                    default_content='[]'
                )
                
                self.sync_file_with_protection(
                    public_data_dir / 'processed_files.json',
                    self.data_dir / 'processed_files.json',
                    default_content='{}'
                )
                
                # Copy any other data files
                for file_path in public_data_dir.glob('*'):
                    if file_path.is_file() and file_path.name not in ['documents.json', 'processed_files.json']:
                        dest_path = self.data_dir / file_path.name
                        shutil.copy2(file_path, dest_path)
                        logger.info(f"✓ Copied additional data file: {file_path.name}")
                
                logger.info("✅ Data synchronization completed")
                return True
                
        except Exception as e:
            logger.error(f"Failed to fetch public data: {e}")
            return False
    
    def sync_file_with_protection(self, source_path: Path, dest_path: Path, default_content: str):
        """Sync a file with timestamp protection"""
        try:
            if not source_path.exists():
                logger.warning(f"Source file not found: {source_path}")
                if not dest_path.exists():
                    dest_path.write_text(default_content, encoding='utf-8')
                    logger.info(f"Created default {dest_path.name}")
                return
            
            # Get timestamps
            source_mtime = source_path.stat().st_mtime
            dest_mtime = dest_path.stat().st_mtime if dest_path.exists() else 0
            
            # Compare timestamps and sync if source is newer or equal
            if source_mtime >= dest_mtime:
                # Validate JSON before copying
                try:
                    with open(source_path, 'r', encoding='utf-8') as f:
                        json.load(f)  # Validate JSON
                    
                    shutil.copy2(source_path, dest_path)
                    logger.info(f"✅ Updated {dest_path.name} (source: {datetime.fromtimestamp(source_mtime)}, local: {datetime.fromtimestamp(dest_mtime)})")
                    
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON in source file: {source_path}")
                    if not dest_path.exists():
                        dest_path.write_text(default_content, encoding='utf-8')
                        logger.info(f"Created default {dest_path.name} due to invalid source")
            else:
                logger.info(f"⚠ Keeping local {dest_path.name} (newer than public repo)")
                
        except Exception as e:
            logger.error(f"Failed to sync {dest_path.name}: {e}")
            if not dest_path.exists():
                dest_path.write_text(default_content, encoding='utf-8')
                logger.info(f"Created default {dest_path.name} due to error")
    
    def validate_local_data(self) -> bool:
        """Validate local data files"""
        logger.info("🔍 Validating local data files...")
        
        valid = True
        
        # Validate documents.json
        documents_file = self.data_dir / 'documents.json'
        if documents_file.exists():
            try:
                with open(documents_file, 'r', encoding='utf-8') as f:
                    documents = json.load(f)
                logger.info(f"✅ documents.json is valid ({len(documents)} documents)")
            except json.JSONDecodeError as e:
                logger.error(f"❌ documents.json is invalid: {e}")
                documents_file.write_text('[]', encoding='utf-8')
                logger.info("Created empty documents.json")
                valid = False
        else:
            documents_file.write_text('[]', encoding='utf-8')
            logger.info("Created missing documents.json")
        
        # Validate processed_files.json
        processed_file = self.data_dir / 'processed_files.json'
        if processed_file.exists():
            try:
                with open(processed_file, 'r', encoding='utf-8') as f:
                    processed = json.load(f)
                logger.info(f"✅ processed_files.json is valid ({len(processed)} entries)")
            except json.JSONDecodeError as e:
                logger.error(f"❌ processed_files.json is invalid: {e}")
                processed_file.write_text('{}', encoding='utf-8')
                logger.info("Created empty processed_files.json")
                valid = False
        else:
            processed_file.write_text('{}', encoding='utf-8')
            logger.info("Created missing processed_files.json")
        
        return valid
    
    def show_status(self):
        """Show current data status"""
        logger.info("📊 Current data status:")
        
        documents_file = self.data_dir / 'documents.json'
        processed_file = self.data_dir / 'processed_files.json'
        
        if documents_file.exists():
            try:
                with open(documents_file, 'r', encoding='utf-8') as f:
                    documents = json.load(f)
                logger.info(f"📄 Documents: {len(documents)} entries")
                
                # Show recent documents
                if documents:
                    recent_docs = sorted(documents, key=lambda x: x.get('upload_date', ''), reverse=True)[:3]
                    logger.info("📋 Recent documents:")
                    for doc in recent_docs:
                        logger.info(f"  - {doc.get('title', doc.get('filename', 'Unknown'))}")
                        
            except json.JSONDecodeError:
                logger.error("❌ documents.json is corrupted")
        else:
            logger.info("📄 Documents: file not found")
        
        if processed_file.exists():
            try:
                with open(processed_file, 'r', encoding='utf-8') as f:
                    processed = json.load(f)
                logger.info(f"🔍 Processed files: {len(processed)} entries")
            except json.JSONDecodeError:
                logger.error("❌ processed_files.json is corrupted")
        else:
            logger.info("🔍 Processed files: file not found")

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Synchronize local data with public repository')
    parser.add_argument('--sync', action='store_true', help='Fetch and sync data from public repository')
    parser.add_argument('--validate', action='store_true', help='Validate local data files')
    parser.add_argument('--status', action='store_true', help='Show current data status')
    
    args = parser.parse_args()
    
    synchronizer = DataSynchronizer()
    
    if args.sync:
        success = synchronizer.fetch_public_data()
        if success:
            synchronizer.validate_local_data()
            synchronizer.show_status()
        else:
            logger.error("Data synchronization failed")
            exit(1)
    elif args.validate:
        valid = synchronizer.validate_local_data()
        if valid:
            logger.info("✅ All data files are valid")
        else:
            logger.warning("⚠ Some data files were corrected")
    elif args.status:
        synchronizer.show_status()
    else:
        # Default: sync and validate
        logger.info("🚀 Starting data synchronization...")
        success = synchronizer.fetch_public_data()
        if success:
            synchronizer.validate_local_data()
            synchronizer.show_status()
            logger.info("✅ Data synchronization completed successfully")
        else:
            logger.error("❌ Data synchronization failed")
            exit(1)

if __name__ == "__main__":
    main()
