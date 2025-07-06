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
        name: 'copy-data',
        async writeBundle() {
          // Copy documents.json to dist/data
          const { promises: fs } = await import('fs');
          const { resolve } = await import('path');
          
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
        }
      }
    ]
  }
});
