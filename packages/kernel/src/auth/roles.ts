/**
 * Trellis Kernel - Roles and Permissions
 *
 * Single source of truth for the RBAC model (ADR-012, resolves OQ-005).
 *
 * Permissions are dot-separated `resource.action` strings — the enforcement
 * unit everywhere (`AuthContext.permissions`, route guards, `$can()` in the
 * UI Data Binding system). Roles are named permission bundles, expanded to
 * permission strings at token issuance; enforcement never checks role names.
 */

// =============================================================================
// PERMISSIONS
// =============================================================================

/** Wildcard permission: grants everything. */
export const PERMISSION_WILDCARD = '*';

/** Canonical permission strings. */
export const Permissions = {
  EntityRead: 'entity.read',
  EntityCreate: 'entity.create',
  EntityUpdate: 'entity.update',
  EntityDelete: 'entity.delete',
  RelationshipRead: 'relationship.read',
  RelationshipWrite: 'relationship.write',
  EventRead: 'event.read',
  ConfigRead: 'config.read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// =============================================================================
// ROLES
// =============================================================================

/** Built-in role names. Tenant-scoped; carried in the JWT `roles` claim. */
export type RoleName = 'admin' | 'editor' | 'viewer';

/**
 * Role → permission bundles.
 *
 * - `admin`: everything (wildcard)
 * - `editor`: full entity/relationship CRUD plus event/config reads
 * - `viewer`: read-only
 */
export const ROLE_PERMISSIONS: Readonly<Record<RoleName, readonly string[]>> = {
  admin: [PERMISSION_WILDCARD],
  editor: [
    Permissions.EntityRead,
    Permissions.EntityCreate,
    Permissions.EntityUpdate,
    Permissions.EntityDelete,
    Permissions.RelationshipRead,
    Permissions.RelationshipWrite,
    Permissions.EventRead,
    Permissions.ConfigRead,
  ],
  viewer: [
    Permissions.EntityRead,
    Permissions.RelationshipRead,
    Permissions.EventRead,
    Permissions.ConfigRead,
  ],
};

/** Check whether a string is a built-in role name. */
export function isRoleName(value: string): value is RoleName {
  return value in ROLE_PERMISSIONS;
}

/**
 * Expand role names into their permission strings (union, deduplicated).
 * Unknown role names expand to nothing.
 */
export function expandRoles(roles: readonly string[]): string[] {
  const result = new Set<string>();
  for (const role of roles) {
    if (isRoleName(role)) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        result.add(permission);
      }
    }
  }
  return [...result];
}

// =============================================================================
// CHECKS
// =============================================================================

/**
 * Check whether a permission set grants a required permission.
 *
 * Supports the `*` wildcard and `resource.*` prefix grants
 * (e.g. holding `entity.*` grants `entity.delete`).
 */
export function hasPermission(
  granted: readonly string[],
  required: string
): boolean {
  for (const permission of granted) {
    if (permission === PERMISSION_WILDCARD) return true;
    if (permission === required) return true;
    if (
      permission.endsWith('.*') &&
      required.startsWith(permission.slice(0, -1))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Normalize a permission list: expands any role names mixed into the list
 * (legacy header auth allows `x-permissions: editor`) and keeps explicit
 * permission strings as-is.
 */
export function normalizePermissions(values: readonly string[]): string[] {
  const result = new Set<string>();
  for (const value of values) {
    if (isRoleName(value)) {
      for (const permission of ROLE_PERMISSIONS[value]) {
        result.add(permission);
      }
    } else {
      result.add(value);
    }
  }
  return [...result];
}
