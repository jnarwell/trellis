/**
 * Trellis E2E Test Harness
 *
 * Main entry point for the E2E test harness.
 * Provides setup, teardown, and utilities for integration testing.
 */

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { TenantId, ActorId } from '@trellis/kernel';
import { buildApp, type AppConfig } from '../../src/app.js';
import {
  createTestPool,
  seedTestData,
  resetTestData,
  cleanupTestData,
  closeTestPool,
  type TestContext,
} from './setup.js';
import { createTestClient, TestClient, type TestClientOptions } from './client.js';

// Re-export all utilities
export * from './setup.js';
export * from './client.js';
export * from './fixtures.js';
export * from './assertions.js';

// =============================================================================
// TEST HARNESS CLASS
// =============================================================================

/**
 * Main test harness class for E2E tests.
 *
 * Usage:
 * ```typescript
 * let harness: TestHarness;
 * let client: TestClient;
 *
 * beforeAll(async () => {
 *   harness = new TestHarness();
 *   await harness.setup();
 * });
 *
 * beforeEach(async () => {
 *   await harness.reset();
 *   client = harness.client();
 * });
 *
 * afterAll(async () => {
 *   await harness.teardown();
 * });
 * ```
 */
export class TestHarness {
  private app: FastifyInstance | null = null;
  private pool: Pool | null = null;
  private context: TestContext | null = null;

  /**
   * Set up the test harness.
   * Creates database pool, seeds test data, and starts Fastify app.
   */
  async setup(): Promise<void> {
    // Create database pool
    this.pool = createTestPool();

    // Seed test tenant and actor
    this.context = await seedTestData(this.pool);

    // Build and start Fastify app
    const config: AppConfig = {
      server: {
        host: '127.0.0.1',
        port: 0, // Use random available port
        env: 'test',
        trustProxy: false,
        logLevel: 'error', // Minimize logging in tests
      },
      database: {
        url: process.env.DATABASE_URL!,
        poolSize: 5,
        connectionTimeoutMs: 10000,
        idleTimeoutMs: 10000,
        ssl: false,
      },
    };

    this.app = await buildApp(config);

    // Wait for app to be ready (Fastify inject doesn't require listen)
    await this.app.ready();
  }

  /**
   * Tear down the test harness.
   * Closes Fastify app, cleans up test data, and closes database pool.
   */
  async teardown(): Promise<void> {
    // Close Fastify app
    if (this.app) {
      await this.app.close();
      this.app = null;
    }

    // Clean up test data
    if (this.pool && this.context) {
      await cleanupTestData(this.pool, this.context.tenantId);
    }

    // Close database pool
    if (this.pool) {
      await closeTestPool(this.pool);
      this.pool = null;
    }

    this.context = null;
  }

  /**
   * Reset test data between tests.
   * Clears entities, relationships, and events while preserving tenant/actor.
   */
  async reset(): Promise<void> {
    if (!this.pool || !this.context) {
      throw new Error('TestHarness not setup. Call setup() first.');
    }

    await resetTestData(this.pool, this.context.tenantId);
  }

  /**
   * Get a test client with automatic authentication headers.
   */
  client(options?: Partial<TestClientOptions>): TestClient {
    if (!this.app || !this.context) {
      throw new Error('TestHarness not setup. Call setup() first.');
    }

    return createTestClient(this.app, {
      tenantId: options?.tenantId ?? this.context.tenantId,
      actorId: options?.actorId ?? this.context.actorId,
      permissions: options?.permissions ?? [],
    });
  }

  /**
   * Get the Fastify app instance.
   */
  getApp(): FastifyInstance {
    if (!this.app) {
      throw new Error('TestHarness not setup. Call setup() first.');
    }
    return this.app;
  }

  /**
   * Get the database pool.
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('TestHarness not setup. Call setup() first.');
    }
    return this.pool;
  }

  /**
   * Get the test context (tenant ID, actor ID).
   */
  getContext(): TestContext {
    if (!this.context) {
      throw new Error('TestHarness not setup. Call setup() first.');
    }
    return this.context;
  }

  /**
   * Get the test tenant ID.
   */
  get tenantId(): TenantId {
    return this.getContext().tenantId;
  }

  /**
   * Get the test actor ID.
   */
  get actorId(): ActorId {
    return this.getContext().actorId;
  }
}

// =============================================================================
// SINGLETON HARNESS (for shared setup)
// =============================================================================

let sharedHarness: TestHarness | null = null;

/**
 * Get or create a shared test harness.
 * Useful for sharing setup across test files.
 */
export async function getSharedHarness(): Promise<TestHarness> {
  if (!sharedHarness) {
    sharedHarness = new TestHarness();
    await sharedHarness.setup();
  }
  return sharedHarness;
}

/**
 * Tear down the shared test harness.
 * Call this in globalTeardown.
 */
export async function teardownSharedHarness(): Promise<void> {
  if (sharedHarness) {
    await sharedHarness.teardown();
    sharedHarness = null;
  }
}
