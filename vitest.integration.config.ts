/**
 * Trellis Integration Test Configuration
 *
 * Configuration for integration tests that require a database.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    // Environment
    environment: 'node',

    // Setup/teardown
    globalSetup: ['./tests/integration/setup.ts'],

    // Longer timeout for integration tests
    testTimeout: 30000,
    hookTimeout: 60000,

    // Run integration tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/node_modules/**', '**/dist/**'],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
    },
  },

  resolve: {
    alias: {
      '@trellis/kernel': path.resolve(__dirname, './packages/kernel/src'),
      '@trellis/shared': path.resolve(__dirname, './packages/shared/src'),
      '@trellis/server': path.resolve(__dirname, './packages/server/src'),
      '@trellis/client': path.resolve(__dirname, './packages/client/src'),
    },
  },
});
