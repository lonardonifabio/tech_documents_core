#!/usr/bin/env python3
"""
Simple document preview generator using only Pillow
Creates beautiful document-style preview images without complex dependencies
"""

import os
import json
import sys
from pathlib import Path
from typing import Dict, Any
import logging
from PIL import Image, ImageDraw, ImageFont

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_document_preview(doc: Dict[str, Any], output_path: Path) -> bool:
    """Create a beautiful document-style preview image"""
    try:
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

def main():
    """Main function to generate all document previews"""
    try:
        # Setup paths
        base_dir = Path.cwd()
        data_dir = base_dir / 'data'
        previews_dir = base_dir / 'previews'
        
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
                preview_filename = f"{doc['id']}.jpg"
                preview_path = previews_dir / preview_filename
                
                if create_document_preview(doc, preview_path):
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
        
        logger.info("Preview generation completed successfully!")
        
    except Exception as e:
        logger.error(f"Fatal error in preview generation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
