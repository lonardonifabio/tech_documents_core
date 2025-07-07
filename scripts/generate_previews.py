#!/usr/bin/env python3
"""
Generate document previews using preview-generator library
Runs in GitHub Actions environment
"""

import os
import json
import sys
import io
from pathlib import Path
from typing import List, Dict, Any
import logging
from PIL import Image
import tempfile
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
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

def create_fallback_preview(doc: Dict[str, Any], output_path: Path) -> bool:
    """Create a fallback preview image when preview-generator fails"""
    try:
        # Create a simple preview image with document info
        from PIL import Image, ImageDraw, ImageFont
        
        # Image dimensions optimized for LinkedIn sharing
        width, height = 1200, 630
        
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
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        draw = ImageDraw.Draw(img)
        
        # Add document icon
        icon_map = {
            'AI': '🤖',
            'Machine Learning': '🧠',
            'Data Science': '📊',
            'Business': '💼',
            'Technology': '⚙️',
            'Research': '🔬'
        }
        icon = icon_map.get(category, '📄')
        
        # Add title (truncated to fit)
        title = doc.get('title', doc.get('filename', 'Document'))
        if len(title) > 50:
            title = title[:47] + '...'
        
        # Center the text
        title_bbox = draw.textbbox((0, 0), title, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (width - title_width) // 2
        
        # Draw text with shadow effect
        shadow_offset = 2
        draw.text((title_x + shadow_offset, 250 + shadow_offset), title, fill=(0, 0, 0, 100), font=title_font)
        draw.text((title_x, 250), title, fill='white', font=title_font)
        
        # Add category badge
        category_text = f"📂 {category}"
        cat_bbox = draw.textbbox((0, 0), category_text, font=subtitle_font)
        cat_width = cat_bbox[2] - cat_bbox[0]
        cat_x = (width - cat_width) // 2
        
        draw.text((cat_x + 1, 321), category_text, fill=(0, 0, 0, 80), font=subtitle_font)
        draw.text((cat_x, 320), category_text, fill='white', font=subtitle_font)
        
        # Add difficulty if available
        if doc.get('difficulty'):
            diff_text = f"🎯 {doc['difficulty']}"
            diff_bbox = draw.textbbox((0, 0), diff_text, font=small_font)
            diff_width = diff_bbox[2] - diff_bbox[0]
            diff_x = (width - diff_width) // 2
            
            draw.text((diff_x + 1, 361), diff_text, fill=(0, 0, 0, 80), font=small_font)
            draw.text((diff_x, 360), diff_text, fill='white', font=small_font)
        
        # Add branding
        brand_text = "AI & Data Science Document Library"
        brand_bbox = draw.textbbox((0, 0), brand_text, font=small_font)
        brand_width = brand_bbox[2] - brand_bbox[0]
        brand_x = width - brand_width - 20
        
        draw.text((brand_x + 1, 591), brand_text, fill=(0, 0, 0, 60), font=small_font)
        draw.text((brand_x, 590), brand_text, fill=(255, 255, 255, 200), font=small_font)
        
        # Save the image
        img.save(output_path, 'JPEG', quality=85, optimize=True)
        logger.info(f"Created fallback preview for {doc.get('filename', 'unknown')}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create fallback preview: {e}")
        return False

def generate_pdf_preview(doc: Dict[str, Any], documents_dir: Path, previews_dir: Path, fitz) -> bool:
    """Generate preview for a single PDF document using PyMuPDF"""
    try:
        doc_path = documents_dir / doc['filepath'].replace('documents/', '')
        preview_filename = f"{doc['id']}.jpg"
        preview_path = previews_dir / preview_filename
        
        # Skip if preview already exists and is newer than document
        if preview_path.exists():
            if doc_path.exists():
                doc_mtime = doc_path.stat().st_mtime
                preview_mtime = preview_path.stat().st_mtime
                if preview_mtime > doc_mtime:
                    logger.info(f"Preview already exists and is up-to-date: {preview_filename}")
                    return True
        
        if not doc_path.exists():
            logger.warning(f"Document file not found: {doc_path}")
            return create_fallback_preview(doc, preview_path)
        
        logger.info(f"Generating PDF preview for: {doc['filename']}")
        
        try:
            # Open PDF document
            pdf_doc = fitz.open(str(doc_path))
            
            if len(pdf_doc) == 0:
                logger.warning(f"PDF has no pages: {doc['filename']}")
                pdf_doc.close()
                return create_fallback_preview(doc, preview_path)
            
            # Get first page
            page = pdf_doc[0]
            
            # Create transformation matrix for high quality rendering
            # Scale factor for good quality (2.0 = 144 DPI)
            mat = fitz.Matrix(2.0, 2.0)
            
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
            final_img.save(preview_path, 'JPEG', quality=85, optimize=True)
            
            # Clean up
            pdf_doc.close()
            
            logger.info(f"Successfully generated PDF preview: {preview_filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing PDF {doc['filename']}: {e}")
            return create_fallback_preview(doc, preview_path)
                
    except Exception as e:
        logger.error(f"Unexpected error processing {doc.get('filename', 'unknown')}: {e}")
        return False

def main():
    """Main function to generate all document previews"""
    try:
        # Setup paths
        base_dir = Path.cwd()
        data_dir = base_dir / 'data'
        documents_dir = base_dir / 'documents'
        public_dir = base_dir / 'public'
        previews_dir = public_dir / 'previews'
        
        # Create directories
        previews_dir.mkdir(parents=True, exist_ok=True)
        
        # Load documents data
        documents_file = data_dir / 'documents.json'
        if not documents_file.exists():
            logger.error("documents.json not found")
            sys.exit(1)
        
        with open(documents_file, 'r', encoding='utf-8') as f:
            documents = json.load(f)
        
        logger.info(f"Found {len(documents)} documents to process")
        
        # Setup PDF processor
        fitz = setup_pdf_processor()
        
        # Generate previews
        successful = 0
        failed = 0
        
        if fitz:
            # Use PyMuPDF for real PDF first page extraction
            logger.info("Using PyMuPDF for PDF first page extraction")
            
            for doc in documents:
                try:
                    if generate_pdf_preview(doc, documents_dir, previews_dir, fitz):
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Failed to process document {doc.get('filename', 'unknown')}: {e}")
                    failed += 1
        else:
            # Fallback to gradient previews
            logger.info("Using gradient fallback mode")
            for doc in documents:
                try:
                    preview_filename = f"{doc['id']}.jpg"
                    preview_path = previews_dir / preview_filename
                    
                    if create_fallback_preview(doc, preview_path):
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Failed to process document {doc.get('filename', 'unknown')}: {e}")
                    failed += 1
        
        logger.info(f"Preview generation completed: {successful} successful, {failed} failed")
        
        # Create summary file
        summary = {
            'total_documents': len(documents),
            'successful_previews': successful,
            'failed_previews': failed,
            'generated_at': str(Path.cwd()),
            'preview_directory': str(previews_dir)
        }
        
        with open(previews_dir / 'generation_summary.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        if failed > 0:
            logger.warning(f"Some previews failed to generate ({failed}/{len(documents)})")
            sys.exit(0)  # Don't fail the build for preview generation issues
        
        logger.info("All previews generated successfully!")
        
    except Exception as e:
        logger.error(f"Fatal error in preview generation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
