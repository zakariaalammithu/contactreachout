import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      // Vitest executes server repositories in Node; retain the source-level
      // server-only guard while resolving it to Next's test-safe empty shim.
      'server-only': path.resolve(process.cwd(), 'node_modules/next/dist/compiled/server-only/empty.js'),
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.mjs'], clearMocks: true },
});
