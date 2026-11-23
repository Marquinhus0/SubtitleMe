import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Separate Vite build for the MV3 content script so it compiles to a
 * self-contained IIFE bundle with no runtime chunk-loading issues on host pages.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(currentDir, 'dist'),
    emptyOutDir: false,
    sourcemap: false,
    target: 'es2022',
    lib: {
      entry: resolve(currentDir, 'src/content/index.ts'),
      name: 'SubtitleMeContent',
      formats: ['iife'],
      fileName: () => 'content/index.js',
    },
  },
});
