#!/usr/bin/env python3
"""
Generate document previews using PyMuPDF (fitz) - more reliable approach
Runs in GitHub Actions environment
"""

import os
import json
import sys
import io
from pathlib import Path
from typing import Dict, Any
import logging
from PIL import Image, ImageDraw, ImageFont
import tempfile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_styled_preview(doc: Dict[str, Any], output_path: Path) -> bool:
    """Create a styled preview image with document info"""
    try:
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
            try:
                # Fallback fonts
                title_font = ImageFont.truetype("/usr/share/fonts/TTF/arial.ttf", 48)
                subtitle_font = ImageFont.truetype("/usr/share/fonts/TTF/arial.ttf", 24)
                small_font = ImageFont.truetype("/usr/share/fonts/TTF/arial.ttf", 18)
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
        try:
            title_bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
        except:
            # Fallback for older PIL versions
            title_width = len(title) * 20
        
        title_x = max(20, (width - title_width) // 2)
        
        # Draw text with shadow effect
        shadow_offset = 2
        draw.text((title_x + shadow_offset, 250 + shadow_offset), title, fill=(0, 0, 0, 100), font=title_font)
        draw.text((title_x, 250), title, fill='white', font=title_font)
        
        # Add category badge
        category_text = f"📂 {category}"
        try:
            cat_bbox = draw.textbbox((0, 0), category_text, font=subtitle_font)
            cat_width = cat_bbox[2] - cat_bbox[0]
        except:
            cat_width = len(category_text) * 12
        
        cat_x = max(20, (width - cat_width) // 2)
        
        draw.text((cat_x + 1, 321), category_text, fill=(0, 0, 0, 80), font=subtitle_font)
        draw.text((cat_x, 320), category_text, fill='white', font=subtitle_font)
        
        # Add difficulty if available
        if doc.get('difficulty'):
            diff_text = f"🎯 {doc['difficulty']}"
            try:
                diff_bbox = draw.textbbox((0, 0), diff_text, font=small_font)
                diff_width = diff_bbox[2] - diff_bbox[0]
            except:
                diff_width = len(diff_text) * 10
            
            diff_x = max(20, (width - diff_width) // 2)
            
            draw.text((diff_x + 1, 361), diff_text, fill=(0, 0, 0, 80), font=small_font)
            draw.text((diff_x, 360), diff_text, fill='white', font=small_font)
        
        # Add branding
        brand_text = "AI & Data Science Document Library"
        try:
            brand_bbox = draw.textbbox((0, 0), brand_text, font=small_font)
            brand_width = brand_bbox[2] - brand_bbox[0]
        except:
            brand_width = len(brand_text) * 8
        
        brand_x = width - brand_width - 20
        
        draw.text((brand_x + 1, 591), brand_text, fill=(0, 0, 0, 60), font=small_font)
        draw.text((brand_x, 590), brand_text, fill=(255, 255, 255, 200), font=small_font)
        
        # Save the image
        img.save(output_path, 'JPEG', quality=85, optimize=True)
        logger.info(f"Created styled preview for {doc.get('filename', 'unknown')}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to create styled preview: {e}")
        return False

def generate_pdf_preview_with_pymupdf(doc_path: Path, output_path: Path) -> bool:
    """Generate preview using PyMuPDF (fitz)"""
    try:
        import fitz  # PyMuPDF
        
        # Open the PDF
        pdf_document = fitz.open(str(doc_path))
        
        if len(pdf_document) == 0:
            logger.warning(f"PDF has no pages: {doc_path}")
            return False
        
        # Get the first page
        page = pdf_document[0]
        
        # Calculate zoom to get desired dimensions
        target_width = 1200
        target_height = 630
        
        # Get page dimensions
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height
        
        # Calculate zoom factors
        zoom_x = target_width / page_width
        zoom_y = target_height / page_height
        zoom = min(zoom_x, zoom_y)  # Use smaller zoom to maintain aspect ratio
        
        # Create transformation matrix
        mat = fitz.Matrix(zoom, zoom)
        
        # Render page to pixmap
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("ppm")
        img = Image.open(io.BytesIO(img_data))
        
        # Resize and center if needed
        if img.size != (target_width, target_height):
            # Create a new image with target dimensions and white background
            final_img = Image.new('RGB', (target_width, target_height), 'white')
            
            # Calculate position to center the image
            x = (target_width - img.width) // 2
            y = (target_height - img.height) // 2
            
            # Paste the rendered page onto the centered position
            final_img.paste(img, (x, y))
            img = final_img
        
        # Save as JPEG
        img.save(output_path, 'JPEG', quality=85, optimize=True)
        
        # Clean up
        pdf_document.close()
        
        logger.info(f"Generated PDF preview using PyMuPDF: {output_path}")
        return True
        
    except ImportError:
        logger.warning("PyMuPDF not available, falling back to styled preview")
        return False
    except Exception as e:
        logger.error(f"Error generating PDF preview with PyMuPDF: {e}")
        return False

def generate_document_preview(doc: Dict[str, Any], documents_dir: Path, previews_dir: Path) -> bool:
    """Generate preview for a single document"""
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
            return create_styled_preview(doc, preview_path)
        
        logger.info(f"Generating preview for: {doc['filename']}")
        
        # Try to generate PDF preview with PyMuPDF first
        if doc_path.suffix.lower() == '.pdf':
            if generate_pdf_preview_with_pymupdf(doc_path, preview_path):
                return True
        
        # Fallback to styled preview
        return create_styled_preview(doc, preview_path)
                
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
        
        # Generate previews
        successful = 0
        failed = 0
        
        for doc in documents:
            try:
                if generate_document_preview(doc, documents_dir, previews_dir):
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
