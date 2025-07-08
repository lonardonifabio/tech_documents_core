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
    // const previewPath = path.resolve(process.cwd(), 'public', 'previews', `${id}.jpg`);
    const previewPath = path.resolve(process.cwd(), 'previews', `${id}.jpg`);
    
    try {
      const imageBuffer = await fs.readFile(previewPath);
      return new Response(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          //'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'Cache-Control': 'max-age=86400', // Cache for 24 hours
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
  const width = 400;
  const height = 300;
  
  // Create a document-like preview that simulates a PDF first page
  const title = (doc.title || doc.filename).substring(0, 50);
  const summary = doc.summary ? doc.summary.substring(0, 200) + '...' : '';
  const authors = doc.authors ? doc.authors.slice(0, 2).join(', ') : '';
  
  // Escape HTML entities
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const safeTitle = escapeHtml(title);
  const safeSummary = escapeHtml(summary);
  const safeAuthors = escapeHtml(authors);

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .doc-bg { fill: #ffffff; }
          .doc-border { fill: none; stroke: #e5e7eb; stroke-width: 2; }
          .doc-shadow { fill: #f3f4f6; }
          .title-text { font-family: 'Times New Roman', serif; font-size: 16px; font-weight: bold; fill: #1f2937; }
          .author-text { font-family: 'Times New Roman', serif; font-size: 12px; fill: #6b7280; }
          .content-text { font-family: 'Times New Roman', serif; font-size: 10px; fill: #374151; }
          .header-line { stroke: #d1d5db; stroke-width: 1; }
        </style>
      </defs>
      
      <!-- Document shadow -->
      <rect x="4" y="4" width="${width-4}" height="${height-4}" rx="4" class="doc-shadow" />
      
      <!-- Document background -->
      <rect x="0" y="0" width="${width-4}" height="${height-4}" rx="4" class="doc-bg" />
      <rect x="0" y="0" width="${width-4}" height="${height-4}" rx="4" class="doc-border" />
      
      <!-- Document header area -->
      <rect x="20" y="20" width="${width-44}" height="60" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2" />
      
      <!-- Title -->
      <text x="25" y="40" class="title-text">
        <tspan x="25" dy="0">${safeTitle.length > 35 ? safeTitle.substring(0, 32) + '...' : safeTitle}</tspan>
      </text>
      
      <!-- Authors -->
      ${safeAuthors ? `<text x="25" y="60" class="author-text">${safeAuthors.length > 40 ? safeAuthors.substring(0, 37) + '...' : safeAuthors}</text>` : ''}
      
      <!-- Header line -->
      <line x1="20" y1="90" x2="${width-24}" y2="90" class="header-line" />
      
      <!-- Content lines (simulating text) -->
      <text x="25" y="110" class="content-text">
        <tspan x="25" dy="0">${safeSummary.length > 45 ? safeSummary.substring(0, 42) + '...' : safeSummary}</tspan>
        <tspan x="25" dy="15">${safeSummary.length > 45 ? safeSummary.substring(42, 87) + '...' : ''}</tspan>
        <tspan x="25" dy="15">${safeSummary.length > 87 ? safeSummary.substring(87, 132) + '...' : ''}</tspan>
        <tspan x="25" dy="15">${safeSummary.length > 132 ? safeSummary.substring(132, 177) + '...' : ''}</tspan>
      </text>
      
      <!-- Simulated text lines -->
      <line x1="25" y1="180" x2="${width-40}" y2="180" stroke="#e5e7eb" stroke-width="1" />
      <line x1="25" y1="195" x2="${width-60}" y2="195" stroke="#e5e7eb" stroke-width="1" />
      <line x1="25" y1="210" x2="${width-45}" y2="210" stroke="#e5e7eb" stroke-width="1" />
      <line x1="25" y1="225" x2="${width-55}" y2="225" stroke="#e5e7eb" stroke-width="1" />
      <line x1="25" y1="240" x2="${width-35}" y2="240" stroke="#e5e7eb" stroke-width="1" />
      
      <!-- Category badge -->
      <rect x="${width-80}" y="10" width="70" height="20" rx="10" fill="#3b82f6" />
      <text x="${width-45}" y="23" font-family="Arial" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${doc.category}</text>
      
      <!-- Page number -->
      <text x="${width-25}" y="${height-10}" font-family="Arial" font-size="8" text-anchor="middle" fill="#9ca3af">1</text>
    </svg>
  `;
}

export const prerender = false;
