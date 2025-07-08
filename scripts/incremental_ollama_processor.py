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
import io
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from fixed_ollama_processor import FixedOllamaDocumentProcessor
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def setup_pdf_processor():
    """Setup PDF processing with PyMuPDF (fitz)"""
    try:
        logger.info("Installing PyMuPDF for PDF processing...")
        os.system("pip install PyMuPDF")
        
        import fitz  # PyMuPDF
        logger.info("✓ PyMuPDF installed successfully")
        return fitz
    except ImportError as e:
        logger.warning(f"Failed to import PyMuPDF: {e}")
        logger.info("Falling back to Pillow-only mode")
        return None
    except Exception as e:
        logger.warning(f"PyMuPDF installation failed: {e}")
        logger.info("Falling back to Pillow-only mode")
        return None

class IncrementalOllamaProcessor(FixedOllamaDocumentProcessor):
    """Enhanced processor for incremental processing with Git commits"""
    
    def __init__(self, model_name: str = "gemma3:4b"):
        super().__init__(model_name)
        self.processed_count = 0
        self.fitz = setup_pdf_processor()  # Setup PDF processor
        
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
            # public_dir = base_dir / 'public'
            # previews_dir = public_dir / 'previews'
            previews_dir = base_dir / 'previews'
            
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
        """Generate preview for a single PDF document using PyMuPDF or fallback"""
        try:
            # Try PDF-based preview first if PyMuPDF is available
            if self.fitz and self.generate_pdf_preview(doc, output_path):
                return True
            
            # Fallback to gradient-based preview
            return self.create_fallback_preview(doc, output_path)
            
        except Exception as e:
            logger.error(f"Failed to create preview: {e}")
            return False
    
    def generate_pdf_preview(self, doc: dict, output_path: Path) -> bool:
        """Generate preview from actual PDF first page using PyMuPDF"""
        try:
            # Find the document path
            doc_path = None
            if 'filepath' in doc:
                doc_path = Path(doc['filepath'].replace('documents/', ''))
                if not doc_path.is_absolute():
                    doc_path = self.documents_dir / doc_path.name
            else:
                # Try to find by filename
                doc_path = self.documents_dir / doc['filename']
            
            if not doc_path or not doc_path.exists():
                logger.warning(f"Document file not found: {doc_path}")
                return False
            
            logger.info(f"Generating PDF preview for: {doc['filename']}")
            
            # Open PDF document
            pdf_doc = self.fitz.open(str(doc_path))
            
            if len(pdf_doc) == 0:
                logger.warning(f"PDF has no pages: {doc['filename']}")
                pdf_doc.close()
                return False
            
            # Get first page
            page = pdf_doc[0]
            
            # Create transformation matrix for high quality rendering
            # Scale factor for good quality (2.0 = 144 DPI)
            mat = self.fitz.Matrix(2.0, 2.0)
            
            # Render page to pixmap
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Resize to target dimensions (400x300 for document cards)
            target_width, target_height = 400, 300
            
            # Calculate aspect ratio and resize
            img_ratio = img.width / img.height
            target_ratio = target_width / target_height
            
            if img_ratio > target_ratio:
                # Image is wider, fit to width
                new_width = target_width
                new_height = int(target_width / img_ratio)
            else:
                # Image is taller, fit to height
                new_height = target_height
                new_width = int(target_height * img_ratio)
            
            # Resize image
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create final image with white background
            final_img = Image.new('RGB', (target_width, target_height), 'white')
            
            # Center the resized image
            x_offset = (target_width - new_width) // 2
            y_offset = (target_height - new_height) // 2
            final_img.paste(img, (x_offset, y_offset))
            
            # Save the preview
            final_img.save(output_path, 'JPEG', quality=85, optimize=True)
            
            # Clean up
            pdf_doc.close()
            
            logger.info(f"Successfully generated PDF preview: {output_path.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing PDF {doc['filename']}: {e}")
            return False
    
    def create_fallback_preview(self, doc: dict, output_path: Path) -> bool:
        """Create a fallback preview image when PDF processing fails"""
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            # Image dimensions optimized for document cards
            width, height = 400, 300
            
            # Category-based colors
            category_colors = {
                'AI': ('#667eea', '#764ba2'),
                'Machine Learning': ('#f093fb', '#f5576c'),
                'Data Science': ('#4facfe', '#00f2fe'),
                'Business': ('#43e97b', '#38f9d7'),
                'Technology': ('#fa709a', '#fee140'),
                'Research': ('#a8edea', '#fed6e3')
            }
            
            category = doc.get('category', 'Technology')
            colors = category_colors.get(category, category_colors['Technology'])
            
            # Create gradient background
            img = Image.new('RGB', (width, height), colors[0])
            draw = ImageDraw.Draw(img)
            
            # Create gradient effect
            for i in range(height):
                ratio = i / height
                r1, g1, b1 = tuple(int(colors[0][1:][i:i+2], 16) for i in (0, 2, 4))
                r2, g2, b2 = tuple(int(colors[1][1:][i:i+2], 16) for i in (0, 2, 4))
                
                r = int(r1 + (r2 - r1) * ratio)
                g = int(g1 + (g2 - g1) * ratio)
                b = int(b1 + (b2 - b1) * ratio)
                
                draw.line([(0, i), (width, i)], fill=(r, g, b))
            
            # Add overlay
            overlay = Image.new('RGBA', (width, height), (0, 0, 0, 50))
            img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
            
            # Try to use a system font, fallback to default
            try:
                title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
                subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
                small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
            except:
                title_font = ImageFont.load_default()
                subtitle_font = ImageFont.load_default()
                small_font = ImageFont.load_default()
            
            draw = ImageDraw.Draw(img)
            
            # Add title (truncated to fit)
            title = doc.get('title', doc.get('filename', 'Document'))
            if len(title) > 30:
                title = title[:27] + '...'
            
            # Center the text
            title_bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = (width - title_width) // 2
            
            # Draw text with shadow effect
            shadow_offset = 1
            draw.text((title_x + shadow_offset, 120 + shadow_offset), title, fill=(0, 0, 0, 100), font=title_font)
            draw.text((title_x, 120), title, fill='white', font=title_font)
            
            # Add category badge
            category_text = f"📂 {category}"
            cat_bbox = draw.textbbox((0, 0), category_text, font=subtitle_font)
            cat_width = cat_bbox[2] - cat_bbox[0]
            cat_x = (width - cat_width) // 2
            
            draw.text((cat_x + 1, 151), category_text, fill=(0, 0, 0, 80), font=subtitle_font)
            draw.text((cat_x, 150), category_text, fill='white', font=subtitle_font)
            
            # Save the image
            img.save(output_path, 'JPEG', quality=85, optimize=True)
            logger.info(f"Created fallback preview for {doc.get('filename', 'unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create fallback preview: {e}")
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
                        preview_src = Path("previews") / f"{doc_id}.jpg"
                        preview_dst = public_repo_path / "previews" / f"{doc_id}.jpg"
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
                result_public = subprocess.run(['git', 'diff', '--quiet', 'previews/'], capture_output=True) #it was public before
                
                if result_data.returncode == 0 and result_public.returncode == 0:
                    logger.info("No changes to commit for public repo")
                    return True
                
                # Add changes from both data and public directories
                subprocess.run(['git', 'add', 'data/'], check=True, capture_output=True)
                subprocess.run(['git', 'add', 'previews/'], check=True, capture_output=True) #it was public before
                
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
