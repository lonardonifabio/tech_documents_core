#!/usr/bin/env python3
"""
Incremental Ollama document processor for GitHub Actions
Processes documents one by one with intermediate commits
"""

import os
import json
import hashlib
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from fixed_ollama_processor import FixedOllamaDocumentProcessor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IncrementalOllamaProcessor(FixedOllamaDocumentProcessor):
    """Enhanced processor for incremental processing with Git commits"""
    
    def __init__(self, model_name: str = "gemma3:4b"):
        super().__init__(model_name)
        self.processed_count = 0
        
        # Inherit the Ollama host configuration from parent class
        logger.info(f"Incremental processor using Ollama host: {self.ollama_host}")
    
    def git_commit_and_push(self, message: str) -> bool:
        """Commit and push changes to GitHub"""
        try:
            # Ensure both JSON files exist before committing
            if not self.data_dir.exists():
                self.data_dir.mkdir(exist_ok=True)
            if not self.dist_data_dir.exists():
                self.dist_data_dir.mkdir(parents=True, exist_ok=True)
            
            # Add specific files to ensure they're tracked
            files_to_add = [
                'data/documents.json',
                'data/processed_files.json'
            ]
            
            for file_path in files_to_add:
                if Path(file_path).exists():
                    subprocess.run(['git', 'add', file_path], check=True, capture_output=True)
                    logger.info(f"Added {file_path} to git")
            
            # Also add any other changes in data directory
            subprocess.run(['git', 'add', 'data/'], check=True, capture_output=True)
            
            # Check if there are changes to commit
            result = subprocess.run(['git', 'diff', '--cached', '--quiet'], capture_output=True)
            if result.returncode == 0:
                logger.info("No changes to commit")
                return True
            
            # Show what will be committed
            status_result = subprocess.run(['git', 'status', '--porcelain', '--cached'], 
                                         capture_output=True, text=True)
            logger.info(f"Files to commit: {status_result.stdout.strip()}")
            
            # Commit changes
            subprocess.run(['git', 'commit', '-m', message], check=True, capture_output=True)
            
            # Push changes
            subprocess.run(['git', 'push'], check=True, capture_output=True)
            logger.info(f"Successfully committed and pushed: {message}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Git operation failed: {e}")
            # Log more details about the error
            if e.stdout:
                logger.error(f"Git stdout: {e.stdout.decode()}")
            if e.stderr:
                logger.error(f"Git stderr: {e.stderr.decode()}")
            return False
    
    def process_single_document_with_commit(self, filepath: Path, processed_files: Dict, existing_documents: List[Dict]) -> bool:
        """Process a single document and commit the result"""
        try:
            logger.info(f"Processing document: {filepath.name}")
            
            # Process the document
            doc_info = self.process_document(filepath)
            
            # Remove old entry if it exists
            existing_documents[:] = [doc for doc in existing_documents if doc['filename'] != filepath.name]
            
            # Add new entry
            existing_documents.append(doc_info)
            
            # Sort by filename for consistency
            existing_documents.sort(key=lambda x: x['filename'])
            
            # Update processed files tracking
            file_path_str = str(filepath)
            current_hash = self.get_file_hash(filepath)
            processed_files[file_path_str] = current_hash
            
            # Save updated data
            self.save_documents(existing_documents)
            self.save_processed_files(processed_files)
            
            self.processed_count += 1
            
            # Commit changes
            commit_message = f"Process document: {filepath.name} ({self.processed_count} processed)"
            success = self.git_commit_and_push(commit_message)
            
            if success:
                logger.info(f"Successfully processed and committed: {filepath.name}")
            else:
                logger.warning(f"Failed to commit changes for: {filepath.name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to process {filepath.name}: {e}")
            return False
    
    def scan_and_process_incrementally(self, force_reprocess: bool = False) -> bool:
        """Scan and process documents incrementally with commits after each"""
        if not self.documents_dir.exists():
            logger.error(f"Documents directory does not exist: {self.documents_dir}")
            return False
        
        # Ensure Ollama model is available
        if not self.ensure_model_available():
            logger.error("Failed to ensure Ollama model availability")
            return False
        
        # Load current state
        processed_files = self.load_processed_files()
        existing_documents = self.load_existing_documents()
        
        # Get all PDF files
        pdf_files = list(self.documents_dir.glob('*.pdf'))
        logger.info(f"Found {len(pdf_files)} PDF files")
        
        total_files = len(pdf_files)
        files_to_process = []
        
        # Determine which files need processing
        for filepath in pdf_files:
            if not filepath.is_file():
                continue
            
            file_path_str = str(filepath)
            current_hash = self.get_file_hash(filepath)
            
            # Check if file needs processing
            needs_processing = (
                force_reprocess or 
                file_path_str not in processed_files or 
                processed_files[file_path_str] != current_hash
            )
            
            if needs_processing:
                files_to_process.append(filepath)
            else:
                logger.info(f"Skipping already processed file: {filepath.name}")
        
        logger.info(f"Found {len(files_to_process)} files to process out of {total_files} total files")
        
        if not files_to_process:
            logger.info("No files need processing")
            return False
        
        # Process files one by one
        successful_processes = 0
        for i, filepath in enumerate(files_to_process, 1):
            logger.info(f"Processing file {i}/{len(files_to_process)}: {filepath.name}")
            
            if self.process_single_document_with_commit(filepath, processed_files, existing_documents):
                successful_processes += 1
            else:
                logger.error(f"Failed to process {filepath.name}, continuing with next file")
        
        # Final summary commit
        if successful_processes > 0:
            final_message = f"Document processing batch complete: {successful_processes}/{len(files_to_process)} documents processed successfully"
            self.git_commit_and_push(final_message)
            logger.info(f"Processing completed: {successful_processes} documents processed successfully")
        
        return successful_processes > 0

def main():
    """Main entry point for incremental processing"""
    import sys
    
    # Allow custom model name via environment variable or argument
    model_name = os.getenv('OLLAMA_MODEL', 'gemma3:4b')
    if len(sys.argv) > 1 and not sys.argv[1].startswith('--'):
        model_name = sys.argv[1]
    
    # Check for force reprocess flag
    force_reprocess = (
        '--force' in sys.argv or 
        '-f' in sys.argv or 
        os.getenv('FORCE_REPROCESS', 'false').lower() == 'true'
    )
    
    processor = IncrementalOllamaProcessor(model_name)
    
    logger.info("Starting incremental document processing...")
    if force_reprocess:
        logger.info("Force reprocessing all documents...")
    
    success = processor.scan_and_process_incrementally(force_reprocess=force_reprocess)
    
    if success:
        logger.info("Incremental document processing completed successfully")
        sys.exit(0)
    else:
        logger.info("No documents were processed")
        sys.exit(0)

if __name__ == "__main__":
    main()
