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
  // Configurazione per puntare ai file pubblici come submodule
  publicDir: './public_data/public',
  vite: {
    // Alias per facilitare l'accesso ai dati pubblici
    resolve: {
      alias: {
        '@documents': './public_data/documents',
        '@data': './public_data/data',
        '@public': './public_data/public'
      }
    },
    plugins: [
      {
        name: 'copy-public-data',
        async writeBundle() {
          const { promises: fs } = await import('fs');
          const { resolve } = await import('path');
          
          // Copia i dati dal submodule pubblico alla build
          const distDataDir = resolve(process.cwd(), 'dist/data');
          const distDocumentsDir = resolve(process.cwd(), 'dist/documents');
          
          try {
            // Crea le directory se non esistono
            await fs.mkdir(distDataDir, { recursive: true });
            await fs.mkdir(distDocumentsDir, { recursive: true });
            
            // Copia documents.json
            const srcDocumentsJson = resolve(process.cwd(), 'public_data/data/documents.json');
            const destDocumentsJson = resolve(process.cwd(), 'dist/data/documents.json');
            
            try {
              await fs.access(srcDocumentsJson);
              await fs.copyFile(srcDocumentsJson, destDocumentsJson);
              console.log('✓ Copied documents.json from public_data to dist/data/');
            } catch {
              console.warn('⚠ public_data/data/documents.json not found, creating empty array');
              await fs.writeFile(destDocumentsJson, '[]');
            }
            
            // Copia processed_files.json se esiste
            const srcProcessedFiles = resolve(process.cwd(), 'public_data/data/processed_files.json');
            const destProcessedFiles = resolve(process.cwd(), 'dist/data/processed_files.json');
            
            try {
              await fs.access(srcProcessedFiles);
              await fs.copyFile(srcProcessedFiles, destProcessedFiles);
              console.log('✓ Copied processed_files.json from public_data to dist/data/');
            } catch {
              console.log('ℹ processed_files.json not found, skipping');
            }
            
            // Copia la cartella documents (solo se non è troppo grande)
            const srcDocuments = resolve(process.cwd(), 'public_data/documents');
            const destDocuments = resolve(process.cwd(), 'dist/documents');
            
            try {
              await fs.access(srcDocuments);
              // Copia solo alcuni file di esempio per il build, non tutti i PDF
              // In produzione, i PDF saranno serviti direttamente dal repository pubblico
              if (process.env.NODE_ENV !== 'production') {
                const { execSync } = await import('child_process');
                execSync(`cp -r "${srcDocuments}" "${resolve(process.cwd(), 'dist/')}"`, { stdio: 'inherit' });
                console.log('✓ Copied documents folder for development');
              } else {
                console.log('ℹ Skipping documents copy in production (served from public repo)');
              }
            } catch {
              console.log('ℹ Documents folder not found, skipping');
            }
            
          } catch (error) {
            console.error('Error copying public data:', error);
          }
        }
      }
    ]
  }
});