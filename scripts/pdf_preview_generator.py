#!/usr/bin/env python3
"""
PDF Preview Generator
Generates preview images for the first page of PDF documents
"""

import os
import json
import hashlib
import logging
import io
from pathlib import Path
from typing import Dict, Set
import fitz  # PyMuPDF
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PDFPreviewGenerator:
    def __init__(self):
        """Initialize the PDF preview generator"""
        self.base_dir = Path.cwd()
        self.documents_dir = self.base_dir / 'documents'
        self.data_dir = self.base_dir / 'data'
        self.previews_dir = self.base_dir / 'previews'
        self.processed_files_path = self.data_dir / 'processed_files.json'
        self.preview_processed_path = self.data_dir / 'preview_processed.json'
        
        # Create previews directory if it doesn't exist
        self.previews_dir.mkdir(exist_ok=True)
        
        logger.info(f"Documents directory: {self.documents_dir}")
        logger.info(f"Previews directory: {self.previews_dir}")
    
    def get_file_hash(self, filepath: Path) -> str:
        """Generate MD5 hash of file content"""
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    
    def load_processed_files(self) -> Dict:
        """Load the list of already processed files with their hashes"""
        if self.processed_files_path.exists():
            with open(self.processed_files_path, 'r') as f:
                return json.load(f)
        return {}
    
    def load_preview_processed_files(self) -> Dict:
        """Load the list of files that have had previews generated"""
        if self.preview_processed_path.exists():
            with open(self.preview_processed_path, 'r') as f:
                return json.load(f)
        return {}
    
    def save_preview_processed_files(self, processed_files: Dict):
        """Save the list of files that have had previews generated"""
        self.data_dir.mkdir(exist_ok=True)
        with open(self.preview_processed_path, 'w') as f:
            json.dump(processed_files, f, indent=2)
    
    def generate_pdf_preview(self, pdf_path: Path, output_path: Path, dpi: int = 150) -> bool:
        """Generate a preview image for the first page of a PDF"""
        try:
            # Open the PDF
            doc = fitz.open(str(pdf_path))
            
            if len(doc) == 0:
                logger.warning(f"PDF {pdf_path.name} has no pages")
                return False
            
            # Get the first page
            page = doc[0]
            
            # Create a matrix for the desired DPI
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            
            # Render page to an image
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Resize to a standard preview size (300x200 for better quality)
            preview_size = (300, 200)
            img.thumbnail(preview_size, Image.Resampling.LANCZOS)
            
            # Create a new image with the exact size and paste the thumbnail
            preview_img = Image.new('RGB', preview_size, (255, 255, 255))
            
            # Calculate position to center the image
            x = (preview_size[0] - img.width) // 2
            y = (preview_size[1] - img.height) // 2
            preview_img.paste(img, (x, y))
            
            # Save as JPEG
            preview_img.save(output_path, 'JPEG', quality=85, optimize=True)
            
            doc.close()
            logger.info(f"Generated preview for {pdf_path.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate preview for {pdf_path.name}: {e}")
            return False
    
    def get_preview_filename(self, pdf_filename: str) -> str:
        """Get the preview filename for a PDF"""
        base_name = Path(pdf_filename).stem
        return f"{base_name}_preview.jpg"
    
    def scan_and_generate_previews(self, force_regenerate: bool = False) -> bool:
        """Scan for PDFs and generate previews for new or changed files"""
        if not self.documents_dir.exists():
            logger.error(f"Documents directory does not exist: {self.documents_dir}")
            return False
        
        # Load processed files info
        processed_files = self.load_processed_files()
        preview_processed = self.load_preview_processed_files()
        
        # Get all PDF files
        pdf_files = list(self.documents_dir.glob('*.pdf'))
        logger.info(f"Found {len(pdf_files)} PDF files")
        
        generated_count = 0
        
        for pdf_path in pdf_files:
            if not pdf_path.is_file():
                continue
            
            file_path_str = str(pdf_path)
            current_hash = self.get_file_hash(pdf_path)
            preview_filename = self.get_preview_filename(pdf_path.name)
            preview_path = self.previews_dir / preview_filename
            
            # Check if we need to generate/regenerate preview
            should_generate = (
                force_regenerate or
                not preview_path.exists() or
                file_path_str not in preview_processed or
                preview_processed[file_path_str] != current_hash
            )
            
            # Also check if the document has been processed (skip if not in processed_files.json)
            if not force_regenerate and file_path_str not in processed_files:
                logger.info(f"Skipping {pdf_path.name} - not in processed_files.json")
                continue
            
            if should_generate:
                logger.info(f"Generating preview for {pdf_path.name}")
                
                if self.generate_pdf_preview(pdf_path, preview_path):
                    preview_processed[file_path_str] = current_hash
                    generated_count += 1
                else:
                    logger.warning(f"Failed to generate preview for {pdf_path.name}")
        
        # Save updated preview processed files
        if generated_count > 0:
            self.save_preview_processed_files(preview_processed)
            logger.info(f"Generated {generated_count} new previews")
        else:
            logger.info("No new previews generated")
        
        return generated_count > 0
    
    def cleanup_orphaned_previews(self):
        """Remove preview files for PDFs that no longer exist"""
        if not self.previews_dir.exists():
            return
        
        # Get all existing PDF files
        existing_pdfs = {f.stem for f in self.documents_dir.glob('*.pdf')}
        
        # Get all preview files
        preview_files = list(self.previews_dir.glob('*_preview.jpg'))
        
        removed_count = 0
        for preview_file in preview_files:
            # Extract the original PDF name from preview filename
            pdf_stem = preview_file.stem.replace('_preview', '')
            
            if pdf_stem not in existing_pdfs:
                logger.info(f"Removing orphaned preview: {preview_file.name}")
                preview_file.unlink()
                removed_count += 1
        
        if removed_count > 0:
            logger.info(f"Removed {removed_count} orphaned preview files")

def main():
    """Main entry point"""
    import sys
    
    # Check for force regenerate flag
    force_regenerate = '--force' in sys.argv or '-f' in sys.argv
    cleanup = '--cleanup' in sys.argv
    
    generator = PDFPreviewGenerator()
    
    if cleanup:
        logger.info("Cleaning up orphaned preview files...")
        generator.cleanup_orphaned_previews()
    
    logger.info("Starting PDF preview generation...")
    if force_regenerate:
        logger.info("Force regenerating all previews...")
    
    success = generator.scan_and_generate_previews(force_regenerate=force_regenerate)
    
    if success:
        logger.info("PDF preview generation completed successfully")
    else:
        logger.info("No new previews were generated")

if __name__ == "__main__":
    main()
