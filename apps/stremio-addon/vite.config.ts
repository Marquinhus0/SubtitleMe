import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, '../..');

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((mod) => `node:${mod}`),
];

export default {
  resolve: {
    alias: {
      '@subtitleme/shared-types': resolve(rootDir, 'packages/shared-types/src/index.ts'),
      '@subtitleme/subtitle-core': resolve(rootDir, 'packages/subtitle-core/src/index.ts'),
      '@subtitleme/subtitle-parser': resolve(rootDir, 'packages/subtitle-parser/src/index.ts'),
    },
  },
  build: {
    target: 'node22',
    outDir: 'dist',
    emptyOutDir: true,
    ssr: resolve(currentDir, 'src/index.ts'),
    rollupOptions: {
      external: [...nodeBuiltins, 'stremio-addon-sdk'],
      output: {
        entryFileNames: 'index.mjs',
        format: 'esm',
      },
    },
  },
};
