/**
 * Trellis E2E Test Seeding
 *
 * Database seeding utilities for E2E tests.
 */

import type { Page } from '@playwright/test';
import {
  loadPartsFixture,
  loadAssembliesFixture,
  loadUsersFixture,
  type PartFixture,
  type AssemblyFixture,
  type UserFixture,
} from './fixtures';

// =============================================================================
// SEED CONFIGURATION
// =============================================================================

export interface SeedConfig {
  /** Base URL for the API */
  apiBaseUrl: string;
  /** Tenant ID to seed data into */
  tenantId: string;
  /** Auth token for seeding requests */
  authToken?: string;
}

const DEFAULT_CONFIG: SeedConfig = {
  apiBaseUrl: 'http://localhost:3000/api',
  tenantId: 'test-tenant',
};

// =============================================================================
// SEED STATE
// =============================================================================

/**
 * Track seeded entities for cleanup.
 */
const seededEntities: { type: string; id: string }[] = [];

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

/**
 * Seed all test data.
 */
export async function seedAll(page: Page, config: Partial<SeedConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Seed users first (needed for auth)
  await seedUsers(page, cfg);

  // Seed parts
  await seedParts(page, cfg);

  // Seed assemblies (depends on parts)
  await seedAssemblies(page, cfg);
}

/**
 * Seed user data.
 */
export async function seedUsers(page: Page, config: Partial<SeedConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const users = loadUsersFixture();

  for (const user of users) {
    await seedEntity(page, 'users', user, cfg);
  }
}

/**
 * Seed part entities.
 */
export async function seedParts(page: Page, config: Partial<SeedConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const parts = loadPartsFixture();

  for (const part of parts) {
    await seedEntity(page, 'entities', part, cfg);
    seededEntities.push({ type: 'part', id: part.id });
  }
}

/**
 * Seed assembly entities.
 */
export async function seedAssemblies(page: Page, config: Partial<SeedConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const assemblies = loadAssembliesFixture();

  for (const assembly of assemblies) {
    await seedEntity(page, 'entities', assembly, cfg);
    seededEntities.push({ type: 'assembly', id: assembly.id });
  }
}

/**
 * Seed a single entity via API.
 */
async function seedEntity(
  page: Page,
  endpoint: string,
  data: unknown,
  config: SeedConfig
): Promise<void> {
  const response = await page.request.post(`${config.apiBaseUrl}/${endpoint}`, {
    data,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': config.tenantId,
      ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    console.warn(`Failed to seed ${endpoint}: ${response.status()} - ${body}`);
  }
}

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

/**
 * Clean up all seeded test data.
 */
export async function cleanupSeededData(page: Page, config: Partial<SeedConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Delete in reverse order (assemblies before parts due to relationships)
  for (const entity of [...seededEntities].reverse()) {
    await deleteEntity(page, entity.id, cfg);
  }

  // Clear tracked entities
  seededEntities.length = 0;
}

/**
 * Delete a single entity via API.
 */
async function deleteEntity(page: Page, id: string, config: SeedConfig): Promise<void> {
  const response = await page.request.delete(`${config.apiBaseUrl}/entities/${id}`, {
    headers: {
      'X-Tenant-ID': config.tenantId,
      ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
    },
  });

  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete entity ${id}: ${response.status()}`);
  }
}

// =============================================================================
// SPECIFIC SEEDERS
// =============================================================================

/**
 * Seed a single part entity.
 */
export async function seedPart(
  page: Page,
  part: PartFixture,
  config: Partial<SeedConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  await seedEntity(page, 'entities', part, cfg);
  seededEntities.push({ type: 'part', id: part.id });
}

/**
 * Seed a single assembly entity.
 */
export async function seedAssembly(
  page: Page,
  assembly: AssemblyFixture,
  config: Partial<SeedConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  await seedEntity(page, 'entities', assembly, cfg);
  seededEntities.push({ type: 'assembly', id: assembly.id });
}

// =============================================================================
// AUTH HELPERS
// =============================================================================

/**
 * Login as a specific user and return auth token.
 */
export async function loginAs(
  page: Page,
  user: UserFixture,
  config: Partial<SeedConfig> = {}
): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const response = await page.request.post(`${cfg.apiBaseUrl}/auth/login`, {
    data: {
      email: user.email,
      // In test mode, we accept user ID as password
      password: user.id,
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': cfg.tenantId,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login as ${user.email}: ${response.status()}`);
  }

  const body = await response.json();
  return body.token as string;
}

/**
 * Set auth context on page for subsequent requests.
 */
export async function setAuthContext(page: Page, token: string): Promise<void> {
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: token,
      domain: 'localhost',
      path: '/',
    },
  ]);
}
