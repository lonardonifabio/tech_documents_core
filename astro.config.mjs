import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind()
  ],
  output: 'static',
  base: process.env.NODE_ENV === 'production' ? '/tech_documents/' : '/',
  build: {
    assets: 'assets'
  },
  vite: {
    plugins: [
      {
        name: 'copy-data-and-previews',
        async writeBundle() {
          const { promises: fs } = await import('fs');
          const { resolve } = await import('path');
          
          // Copy documents.json to dist/data
          const distDataDir = resolve(process.cwd(), 'dist/data');
          try {
            await fs.access(distDataDir);
          } catch {
            await fs.mkdir(distDataDir, { recursive: true });
          }
          
          const srcFile = resolve(process.cwd(), 'data/documents.json');
          const destFile = resolve(process.cwd(), 'dist/data/documents.json');
          
          try {
            await fs.access(srcFile);
            await fs.copyFile(srcFile, destFile);
            console.log('✓ Copied documents.json to dist/data/');
          } catch {
            console.warn('⚠ data/documents.json not found, creating empty array');
            await fs.writeFile(destFile, '[]');
          }
          
          // Copy previews folder to dist/previews
          const srcPreviewsDir = resolve(process.cwd(), 'previews');
          const distPreviewsDir = resolve(process.cwd(), 'dist/previews');
          
          try {
            await fs.access(srcPreviewsDir);
            
            // Create dist/previews directory
            try {
              await fs.access(distPreviewsDir);
            } catch {
              await fs.mkdir(distPreviewsDir, { recursive: true });
            }
            
            // Copy all files from previews to dist/previews
            const files = await fs.readdir(srcPreviewsDir);
            let copiedCount = 0;
            
            for (const file of files) {
              const srcFilePath = resolve(srcPreviewsDir, file);
              const destFilePath = resolve(distPreviewsDir, file);
              
              try {
                const stat = await fs.stat(srcFilePath);
                if (stat.isFile()) {
                  await fs.copyFile(srcFilePath, destFilePath);
                  copiedCount++;
                }
              } catch (err) {
                console.warn(`⚠ Failed to copy preview file ${file}:`, err.message);
              }
            }
            
            console.log(`✓ Copied ${copiedCount} preview images to dist/previews/`);
          } catch {
            console.warn('⚠ previews directory not found, skipping preview copy');
          }
        }
      }
    ]
  }
});
