/**
 * Trellis Server Package - Vitest Configuration
 *
 * Excludes e2e tests (which require DATABASE_URL) from default test runs.
 * Use pnpm test:integration for database-dependent tests.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/__tests__/*.test.ts'],
    exclude: ['tests/e2e/**/*.test.ts', 'node_modules'],
  },
});
