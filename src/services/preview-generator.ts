export interface DocumentPreviewOptions {
  width?: number;
  height?: number;
  quality?: number;
}

export class PreviewGenerator {
  private static instance: PreviewGenerator;
  private cache: Map<string, string> = new Map();

  static getInstance(): PreviewGenerator {
    if (!PreviewGenerator.instance) {
      PreviewGenerator.instance = new PreviewGenerator();
    }
    return PreviewGenerator.instance;
  }

  /**
   * Generate a document-specific preview image with metadata
   */
  async generateDocumentPreview(
    doc: any,
    options: DocumentPreviewOptions = {}
  ): Promise<string> {
    const {
      width = 1200,
      height = 630,
      quality = 0.9
    } = options;

    // Check cache first
    const cacheKey = `${doc.id}_${width}_${height}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = width;
    canvas.height = height;

    // Category-based gradients and styling
    const categoryStyles = {
      'AI': {
        gradient: ['#667eea', '#764ba2'],
        icon: '🤖',
        accent: '#667eea'
      },
      'Machine Learning': {
        gradient: ['#f093fb', '#f5576c'],
        icon: '🧠',
        accent: '#f093fb'
      },
      'Data Science': {
        gradient: ['#4facfe', '#00f2fe'],
        icon: '📊',
        accent: '#4facfe'
      },
      'Business': {
        gradient: ['#43e97b', '#38f9d7'],
        icon: '💼',
        accent: '#43e97b'
      },
      'Technology': {
        gradient: ['#fa709a', '#fee140'],
        icon: '⚙️',
        accent: '#fa709a'
      },
      'Research': {
        gradient: ['#a8edea', '#fed6e3'],
        icon: '🔬',
        accent: '#a8edea'
      }
    };

    const style = categoryStyles[doc.category as keyof typeof categoryStyles] || categoryStyles['Technology'];

    // Create gradient background
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, style.gradient[0]);
    gradient.addColorStop(1, style.gradient[1]);
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    // Add subtle overlay for better text readability
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    context.fillRect(0, 0, width, height);

    // Add decorative elements
    this.addDecorativeElements(context, width, height, style.accent);

    // Set text properties
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw icon
    context.font = '100px Arial';
    context.fillText(style.icon, width / 2, height / 2 - 120);

    // Draw title with word wrapping
    const title = doc.title || doc.filename;
    this.drawWrappedText(context, title, width / 2, height / 2 - 40, 900, 'bold 42px Arial', 50);

    // Draw category badge
    this.drawBadge(context, doc.category, width / 2 - 100, height / 2 + 40, style.accent);
    
    // Draw difficulty badge
    this.drawBadge(context, doc.difficulty, width / 2 + 100, height / 2 + 40, '#ff6b6b');

    // Draw keywords (first 3)
    if (doc.keywords && doc.keywords.length > 0) {
      const keywords = doc.keywords.slice(0, 3).join(' • ');
      context.font = '18px Arial';
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.drawWrappedText(context, keywords, width / 2, height / 2 + 100, 800, '18px Arial', 25);
    }

    // Add branding
    context.font = 'bold 16px Arial';
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.textAlign = 'right';
    context.fillText('AI & Data Science Document Library', width - 40, height - 30);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    
    // Cache the result
    this.cache.set(cacheKey, dataUrl);
    
    return dataUrl;
  }

  /**
   * Add decorative geometric elements
   */
  private addDecorativeElements(context: CanvasRenderingContext2D, width: number, height: number, accentColor: string): void {
    context.save();
    
    // Add subtle geometric shapes
    context.globalAlpha = 0.1;
    context.fillStyle = '#ffffff';
    
    // Top-left circle
    context.beginPath();
    context.arc(100, 100, 80, 0, Math.PI * 2);
    context.fill();
    
    // Bottom-right circle
    context.beginPath();
    context.arc(width - 100, height - 100, 60, 0, Math.PI * 2);
    context.fill();
    
    // Center accent shapes
    context.globalAlpha = 0.05;
    context.fillStyle = accentColor;
    
    // Hexagon pattern
    for (let i = 0; i < 3; i++) {
      const x = width * 0.8 + i * 40;
      const y = height * 0.3 + i * 30;
      this.drawHexagon(context, x, y, 20);
    }
    
    context.restore();
  }

  /**
   * Draw a hexagon shape
   */
  private drawHexagon(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    context.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }
    context.closePath();
    context.fill();
  }

  /**
   * Draw text with word wrapping
   */
  private drawWrappedText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: string,
    lineHeight: number
  ): void {
    context.font = font;
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, currentY);
  }

  /**
   * Draw a rounded badge
   */
  private drawBadge(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string
  ): void {
    context.save();
    
    // Measure text
    context.font = 'bold 16px Arial';
    const metrics = context.measureText(text);
    const padding = 20;
    const badgeWidth = metrics.width + padding * 2;
    const badgeHeight = 32;
    
    // Draw badge background
    context.fillStyle = color;
    context.globalAlpha = 0.9;
    this.drawRoundedRect(context, x - badgeWidth / 2, y - badgeHeight / 2, badgeWidth, badgeHeight, 16);
    context.fill();
    
    // Draw badge text
    context.globalAlpha = 1;
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, x, y);
    
    context.restore();
  }

  /**
   * Draw a rounded rectangle
   */
  private drawRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
