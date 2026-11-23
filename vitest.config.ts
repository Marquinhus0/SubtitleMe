import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@subtitleme/shared-types': resolve(rootDir, 'packages/shared-types/src/index.ts'),
      '@subtitleme/subtitle-core': resolve(rootDir, 'packages/subtitle-core/src/index.ts'),
      '@subtitleme/subtitle-parser': resolve(rootDir, 'packages/subtitle-parser/src/index.ts'),
      '@subtitleme/subtitle-sync': resolve(rootDir, 'packages/subtitle-sync/src/index.ts'),
      '@subtitleme/subtitle-renderer': resolve(rootDir, 'packages/subtitle-renderer/src/index.ts'),
      '@subtitleme/subtitle-storage': resolve(rootDir, 'packages/subtitle-storage/src/index.ts'),
    },
  },
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'packages/**/*.test.ts',
      'apps/stremio-addon/tests/**/*.test.ts',
    ],
    environment: 'node',
    globals: false,
  },
});
