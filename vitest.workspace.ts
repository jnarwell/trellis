/**
 * Trellis Vitest Workspace Configuration
 *
 * Defines all test projects in the monorepo.
 */

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Kernel package tests
  {
    extends: './packages/kernel/vitest.config.ts',
    test: {
      name: 'kernel',
      root: './packages/kernel',
      include: ['tests/**/*.test.ts'],
    },
  },

  // Shared package tests
  {
    test: {
      name: 'shared',
      root: './packages/shared',
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  },

  // Server package tests
  {
    test: {
      name: 'server',
      root: './packages/server',
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  },

  // Client package tests
  {
    test: {
      name: 'client',
      root: './packages/client',
      include: ['tests/**/*.test.ts'],
      environment: 'jsdom',
    },
  },

  // Integration tests (root level)
  {
    extends: './vitest.integration.config.ts',
    test: {
      name: 'integration',
      root: '.',
      include: ['tests/integration/**/*.test.ts'],
    },
  },
]);
