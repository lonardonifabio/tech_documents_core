import type { APIRoute } from 'astro';

export async function getStaticPaths() {
  // Load documents data to generate static paths for all documents
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const documentsPath = path.resolve(process.cwd(), 'data/documents.json');
    const data = await fs.readFile(documentsPath, 'utf-8');
    const documents = JSON.parse(data);
    
    return documents.map((doc: any) => ({
      params: { id: doc.id }
    }));
  } catch (error) {
    console.warn('Could not load documents for preview static paths:', error);
    return [];
  }
}

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  
  if (!id) {
    return new Response('Document ID required', { status: 400 });
  }

  try {
    // First, try to serve the generated preview image
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Check for generated preview in public/previews/
    const previewPath = path.resolve(process.cwd(), 'public', 'previews', `${id}.jpg`);
    
    try {
      const imageBuffer = await fs.readFile(previewPath);
      return new Response(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    } catch (previewError) {
      console.log(`Generated preview not found for ${id}, falling back to SVG generation`);
    }

    // Fallback: Load documents data and generate SVG
    const documentsPath = path.resolve(process.cwd(), 'data/documents.json');
    const data = await fs.readFile(documentsPath, 'utf-8');
    const documents = JSON.parse(data);
    
    // Find the document
    const doc = documents.find((d: any) => d.id === id);
    if (!doc) {
      return new Response('Document not found', { status: 404 });
    }

    // Generate a simple SVG preview as fallback
    const svg = generateSVGPreview(doc);
    
    return new Response(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error serving preview:', error);
    
    // Ultimate fallback to redirect to default image
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://www.fabiolonardoni.it/AIdatasciencelibrary_cover.JPG'
      }
    });
  }
};

function generateSVGPreview(doc: any): string {
  const width = 1200;
  const height = 630;
  
  // Category-based styling
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
  const title = (doc.title || doc.filename).substring(0, 60); // Limit title length
  const keywords = doc.keywords ? doc.keywords.slice(0, 3).join(' • ') : '';

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${style.gradient[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${style.gradient[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)" />
      
      <!-- Overlay -->
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.2)" />
      
      <!-- Decorative circles -->
      <circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.1)" />
      <circle cx="1100" cy="530" r="60" fill="rgba(255,255,255,0.1)" />
      
      <!-- Icon -->
      <text x="600" y="200" font-family="Arial" font-size="100" text-anchor="middle" fill="white">${style.icon}</text>
      
      <!-- Title -->
      <text x="600" y="280" font-family="Arial" font-size="42" font-weight="bold" text-anchor="middle" fill="white">
        <tspan x="600" dy="0">${title}</tspan>
      </text>
      
      <!-- Category Badge -->
      <rect x="450" y="340" width="120" height="32" rx="16" fill="${style.accent}" fill-opacity="0.9" />
      <text x="510" y="360" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="white">${doc.category}</text>
      
      <!-- Difficulty Badge -->
      <rect x="630" y="340" width="120" height="32" rx="16" fill="#ff6b6b" fill-opacity="0.9" />
      <text x="690" y="360" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="white">${doc.difficulty}</text>
      
      <!-- Keywords -->
      <text x="600" y="420" font-family="Arial" font-size="18" text-anchor="middle" fill="rgba(255,255,255,0.9)">${keywords}</text>
      
      <!-- Branding -->
      <text x="1160" y="600" font-family="Arial" font-size="16" font-weight="bold" text-anchor="end" fill="rgba(255,255,255,0.8)">AI & Data Science Document Library</text>
    </svg>
  `;
}

export const prerender = false;
