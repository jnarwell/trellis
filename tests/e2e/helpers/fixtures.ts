/**
 * Trellis E2E Test Fixtures
 *
 * Typed fixture loading utilities for E2E tests.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// FIXTURE TYPES
// =============================================================================

export interface PartFixture {
  id: string;
  type: 'part';
  version: number;
  state: 'draft' | 'in_review' | 'released' | 'obsolete';
  properties: {
    part_number: PropertyValue<string>;
    name: PropertyValue<string>;
    description?: PropertyValue<string>;
    unit_cost?: PropertyValue<number>;
    quantity?: PropertyValue<number>;
    weight?: PropertyValue<number>;
    material?: PropertyValue<string>;
  };
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface AssemblyFixture {
  id: string;
  type: 'assembly';
  version: number;
  state: 'draft' | 'released';
  properties: {
    assembly_number: PropertyValue<string>;
    name: PropertyValue<string>;
    description?: PropertyValue<string>;
  };
  relationships: {
    children: string[];
  };
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UserFixture {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'engineer' | 'viewer';
  permissions: string[];
  tenantId: string;
  metadata: {
    createdAt: string;
  };
}

interface PropertyValue<T> {
  value: T;
  source: 'literal' | 'inherited' | 'computed' | 'measured';
}

// =============================================================================
// FIXTURE PATHS
// =============================================================================

const FIXTURES_DIR = join(__dirname, '../../fixtures');

export const FIXTURE_PATHS = {
  products: {
    plmTest: join(FIXTURES_DIR, 'products/plm-test.yaml'),
  },
  entities: {
    parts: join(FIXTURES_DIR, 'entities/parts.json'),
    assemblies: join(FIXTURES_DIR, 'entities/assemblies.json'),
  },
  users: {
    testUsers: join(FIXTURES_DIR, 'users/test-users.json'),
  },
} as const;

// =============================================================================
// FIXTURE LOADERS
// =============================================================================

/**
 * Load parts fixture data.
 */
export function loadPartsFixture(): PartFixture[] {
  const raw = readFileSync(FIXTURE_PATHS.entities.parts, 'utf-8');
  return JSON.parse(raw) as PartFixture[];
}

/**
 * Load assemblies fixture data.
 */
export function loadAssembliesFixture(): AssemblyFixture[] {
  const raw = readFileSync(FIXTURE_PATHS.entities.assemblies, 'utf-8');
  return JSON.parse(raw) as AssemblyFixture[];
}

/**
 * Load users fixture data.
 */
export function loadUsersFixture(): UserFixture[] {
  const raw = readFileSync(FIXTURE_PATHS.users.testUsers, 'utf-8');
  return JSON.parse(raw) as UserFixture[];
}

/**
 * Load product YAML fixture.
 */
export function loadProductFixture(path: string): string {
  return readFileSync(path, 'utf-8');
}

// =============================================================================
// FIXTURE HELPERS
// =============================================================================

/**
 * Get a specific part by ID from fixtures.
 */
export function getPartById(id: string): PartFixture | undefined {
  const parts = loadPartsFixture();
  return parts.find((p) => p.id === id);
}

/**
 * Get a specific part by state from fixtures.
 */
export function getPartByState(state: PartFixture['state']): PartFixture | undefined {
  const parts = loadPartsFixture();
  return parts.find((p) => p.state === state);
}

/**
 * Get a specific user by role from fixtures.
 */
export function getUserByRole(role: UserFixture['role']): UserFixture | undefined {
  const users = loadUsersFixture();
  return users.find((u) => u.role === role);
}

/**
 * Get admin user from fixtures.
 */
export function getAdminUser(): UserFixture {
  const user = getUserByRole('admin');
  if (!user) throw new Error('Admin user not found in fixtures');
  return user;
}

/**
 * Get viewer user from fixtures.
 */
export function getViewerUser(): UserFixture {
  const user = getUserByRole('viewer');
  if (!user) throw new Error('Viewer user not found in fixtures');
  return user;
}

/**
 * Get the first released part from fixtures.
 */
export function getReleasedPart(): PartFixture {
  const part = getPartByState('released');
  if (!part) throw new Error('No released part found in fixtures');
  return part;
}

/**
 * Get the first draft part from fixtures.
 */
export function getDraftPart(): PartFixture {
  const part = getPartByState('draft');
  if (!part) throw new Error('No draft part found in fixtures');
  return part;
}
