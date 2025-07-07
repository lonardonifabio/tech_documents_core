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
        """Process a single document and commit the result to public repository"""
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
            
            # Update processed files tracking with consistent public repo path format
            # Convert private repo path to public repo path format for consistency
            filename = filepath.name
            public_repo_path = f"/home/runner/work/tech_documents/tech_documents/documents/{filename}"
            current_hash = self.get_file_hash(filepath)
            processed_files[public_repo_path] = current_hash
            
            # Save updated data locally
            self.save_documents(existing_documents)
            self.save_processed_files(processed_files)
            
            self.processed_count += 1
            
            # Commit to public repository after each document
            success = self.commit_to_public_repo(filepath.name)
            
            if success:
                logger.info(f"Successfully processed and committed: {filepath.name} ({self.processed_count} processed)")
            else:
                logger.warning(f"Processed {filepath.name} but failed to commit to public repo")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to process {filepath.name}: {e}")
            return False
    
    def generate_preview_for_document(self, doc_id: str) -> bool:
        """Generate preview for a specific document"""
        try:
            logger.info(f"Generating preview for document ID: {doc_id}")
            
            # Import preview generation functionality
            from pathlib import Path
            import json
            from PIL import Image, ImageDraw, ImageFont
            
            # Setup paths
            base_dir = Path.cwd()
            data_dir = base_dir / 'data'
            public_dir = base_dir / 'public'
            previews_dir = public_dir / 'previews'
            
            # Create previews directory if it doesn't exist
            previews_dir.mkdir(parents=True, exist_ok=True)
            
            # Load documents data to find the specific document
            documents_file = data_dir / 'documents.json'
            if not documents_file.exists():
                logger.error("documents.json not found for preview generation")
                return False
            
            with open(documents_file, 'r', encoding='utf-8') as f:
                documents = json.load(f)
            
            # Find the document by ID
            target_doc = None
            for doc in documents:
                if doc.get('id') == doc_id:
                    target_doc = doc
                    break
            
            if not target_doc:
                logger.error(f"Document with ID {doc_id} not found")
                return False
            
            # Generate preview using the same logic as generate_previews_simple.py
            preview_filename = f"{doc_id}.jpg"
            preview_path = previews_dir / preview_filename
            
            return self.create_document_preview(target_doc, preview_path)
            
        except Exception as e:
            logger.error(f"Failed to generate preview for {doc_id}: {e}")
            return False
    
    def create_document_preview(self, doc: dict, output_path: Path) -> bool:
        """Create a beautiful document-style preview image"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Image dimensions optimized for document cards
            width, height = 400, 300
            
            # Create white document background
            img = Image.new('RGB', (width, height), '#ffffff')
            draw = ImageDraw.Draw(img)
            
            # Try to use system fonts, fallback to default
            try:
                # Try different font paths for different systems
                font_paths = [
                    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
                    '/System/Library/Fonts/Helvetica.ttc',
                    'C:/Windows/Fonts/arial.ttf'
                ]
                
                title_font = None
                subtitle_font = None
                content_font = None
                
                for font_path in font_paths:
                    if os.path.exists(font_path):
                        try:
                            title_font = ImageFont.truetype(font_path, 16)
                            subtitle_font = ImageFont.truetype(font_path, 12)
                            content_font = ImageFont.truetype(font_path, 10)
                            break
                        except:
                            continue
                
                # Fallback to default font
                if not title_font:
                    title_font = ImageFont.load_default()
                    subtitle_font = ImageFont.load_default()
                    content_font = ImageFont.load_default()
                    
            except Exception as e:
                logger.warning(f"Font loading failed: {e}, using default font")
                title_font = ImageFont.load_default()
                subtitle_font = ImageFont.load_default()
                content_font = ImageFont.load_default()
            
            # Document shadow and border
            shadow_color = '#e5e7eb'
            border_color = '#d1d5db'
            
            # Draw document shadow
            draw.rectangle([3, 3, width-1, height-1], fill=shadow_color)
            
            # Draw document background
            draw.rectangle([0, 0, width-4, height-4], fill='#ffffff', outline=border_color, width=2)
            
            # Header area
            header_height = 60
            draw.rectangle([15, 15, width-19, 15 + header_height], fill='#f9fafb', outline='#e5e7eb', width=1)
            
            # Document title
            title = (doc.get('title') or doc.get('filename', 'Document'))[:45]
            if len(title) > 42:
                title = title[:39] + '...'
            
            # Draw title
            draw.text((20, 25), title, fill='#1f2937', font=title_font)
            
            # Authors
            authors = doc.get('authors', [])
            if authors:
                author_text = ', '.join(authors[:2])
                if len(author_text) > 35:
                    author_text = author_text[:32] + '...'
                draw.text((20, 45), author_text, fill='#6b7280', font=subtitle_font)
            
            # Header line
            draw.line([(15, 85), (width-19, 85)], fill='#d1d5db', width=1)
            
            # Content area - simulate document text
            summary = doc.get('summary', '')
            if summary:
                # Break summary into lines
                words = summary.split()
                lines = []
                current_line = []
                
                for word in words:
                    test_line = ' '.join(current_line + [word])
                    if len(test_line) <= 40:  # Approximate character limit per line
                        current_line.append(word)
                    else:
                        if current_line:
                            lines.append(' '.join(current_line))
                            current_line = [word]
                        else:
                            lines.append(word)
                    
                    if len(lines) >= 4:  # Limit to 4 lines
                        break
                
                if current_line and len(lines) < 4:
                    lines.append(' '.join(current_line))
                
                # Draw content lines
                y_pos = 100
                for i, line in enumerate(lines[:4]):
                    if i == 3 and len(line) > 37:  # Last line, add ellipsis if needed
                        line = line[:34] + '...'
                    draw.text((20, y_pos), line, fill='#374151', font=content_font)
                    y_pos += 15
            
            # Simulate additional text lines
            line_y_positions = [170, 185, 200, 215, 230]
            line_widths = [width-50, width-70, width-55, width-65, width-45]
            
            for y_pos, line_width in zip(line_y_positions, line_widths):
                if y_pos < height - 30:  # Don't draw too close to bottom
                    draw.line([(20, y_pos), (line_width, y_pos)], fill='#e5e7eb', width=1)
            
            # Category badge
            category = doc.get('category', 'Document')
            badge_width = min(len(category) * 8 + 20, 80)
            badge_x = width - badge_width - 10
            draw.rectangle([badge_x, 8, badge_x + badge_width, 28], fill='#3b82f6', outline='#2563eb')
            
            # Calculate text position for centering
            bbox = draw.textbbox((0, 0), category, font=content_font)
            text_width = bbox[2] - bbox[0]
            text_x = badge_x + (badge_width - text_width) // 2
            draw.text((text_x, 13), category, fill='white', font=content_font)
            
            # Page number
            draw.text((width-25, height-20), '1', fill='#9ca3af', font=content_font)
            
            # Save the image
            img.save(output_path, 'JPEG', quality=85, optimize=True)
            logger.info(f"Created preview for {doc.get('filename', 'unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create preview: {e}")
            return False

    def commit_to_public_repo(self, filename: str) -> bool:
        """Commit updated JSON files to public repository"""
        try:
            from pathlib import Path
            import os
            
            public_repo_path = Path("public_repo")
            if not public_repo_path.exists():
                logger.error("Public repository not found. Make sure workflow setup step completed.")
                return False
            
            # Copy updated data files to public repo
            import shutil
            shutil.copy2("data/documents.json", "public_repo/data/documents.json")
            shutil.copy2("data/processed_files.json", "public_repo/data/processed_files.json")
            
            # Generate preview for the newly processed document
            # Find the document ID from the filename
            try:
                with open("data/documents.json", 'r', encoding='utf-8') as f:
                    documents = json.load(f)
                
                doc_id = None
                for doc in documents:
                    if doc.get('filename') == filename:
                        doc_id = doc.get('id')
                        break
                
                if doc_id:
                    logger.info(f"Generating preview for document: {filename} (ID: {doc_id})")
                    preview_success = self.generate_preview_for_document(doc_id)
                    if preview_success:
                        logger.info(f"✅ Preview generated for {filename}")
                        # Copy the generated preview to public repo
                        preview_src = Path("public/previews") / f"{doc_id}.jpg"
                        preview_dst = public_repo_path / "public" / "previews" / f"{doc_id}.jpg"
                        preview_dst.parent.mkdir(parents=True, exist_ok=True)
                        if preview_src.exists():
                            shutil.copy2(preview_src, preview_dst)
                            logger.info(f"✅ Preview copied to public repo for {filename}")
                    else:
                        logger.warning(f"⚠️ Failed to generate preview for {filename}")
                else:
                    logger.warning(f"Could not find document ID for {filename}")
                    
            except Exception as e:
                logger.warning(f"Preview generation failed for {filename}: {e}")
            
            # Change to public repo directory and commit
            original_dir = os.getcwd()
            os.chdir("public_repo")
            
            try:
                # Check if there are changes in data or public directories
                result_data = subprocess.run(['git', 'diff', '--quiet', 'data/'], capture_output=True)
                result_public = subprocess.run(['git', 'diff', '--quiet', 'public/'], capture_output=True)
                
                if result_data.returncode == 0 and result_public.returncode == 0:
                    logger.info("No changes to commit for public repo")
                    return True
                
                # Add changes from both data and public directories
                subprocess.run(['git', 'add', 'data/'], check=True, capture_output=True)
                subprocess.run(['git', 'add', 'public/'], check=True, capture_output=True)
                
                commit_message = f"Process document: {filename} - AI analysis and preview complete"
                subprocess.run(['git', 'commit', '-m', commit_message], check=True, capture_output=True)
                subprocess.run(['git', 'push'], check=True, capture_output=True)
                
                logger.info(f"✅ Committed {filename} analysis and preview to public repository")
                return True
                
            finally:
                os.chdir(original_dir)
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Git operation failed for public repo: {e}")
            if e.stdout:
                logger.error(f"Git stdout: {e.stdout.decode()}")
            if e.stderr:
                logger.error(f"Git stderr: {e.stderr.decode()}")
            return False
        except Exception as e:
            logger.error(f"Failed to commit to public repo: {e}")
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
            
            # Use consistent public repo path format for checking
            filename = filepath.name
            public_repo_path = f"/home/runner/work/tech_documents/tech_documents/documents/{filename}"
            current_hash = self.get_file_hash(filepath)
            
            # Check if file needs processing using consistent path format
            needs_processing = (
                force_reprocess or 
                public_repo_path not in processed_files or 
                processed_files[public_repo_path] != current_hash
            )
            
            if needs_processing:
                files_to_process.append(filepath)
                logger.info(f"File needs processing: {filepath.name} (path: {public_repo_path})")
            else:
                logger.info(f"Skipping already processed file: {filepath.name} (path: {public_repo_path})")
        
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
        
        # Final summary
        if successful_processes > 0:
            logger.info(f"Processing completed: {successful_processes}/{len(files_to_process)} documents processed successfully")
        
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
