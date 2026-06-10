/**
 * Auth (Roles and Permissions) Tests - ADR-012
 */

import { describe, it, expect } from 'vitest';
import {
  Permissions,
  ROLE_PERMISSIONS,
  PERMISSION_WILDCARD,
  isRoleName,
  expandRoles,
  hasPermission,
  normalizePermissions,
} from '../src/auth/index.js';

describe('Roles and Permissions (ADR-012)', () => {
  describe('expandRoles', () => {
    it('expands admin to the wildcard', () => {
      expect(expandRoles(['admin'])).toEqual([PERMISSION_WILDCARD]);
    });

    it('expands editor to full CRUD plus reads', () => {
      const permissions = expandRoles(['editor']);
      expect(permissions).toContain(Permissions.EntityCreate);
      expect(permissions).toContain(Permissions.EntityUpdate);
      expect(permissions).toContain(Permissions.EntityDelete);
      expect(permissions).toContain(Permissions.EntityRead);
      expect(permissions).toContain(Permissions.EventRead);
      expect(permissions).not.toContain(PERMISSION_WILDCARD);
    });

    it('expands viewer to reads only', () => {
      const permissions = expandRoles(['viewer']);
      expect(permissions).toContain(Permissions.EntityRead);
      expect(permissions).toContain(Permissions.EventRead);
      expect(permissions).not.toContain(Permissions.EntityCreate);
      expect(permissions).not.toContain(Permissions.EntityDelete);
    });

    it('unions multiple roles without duplicates', () => {
      const permissions = expandRoles(['viewer', 'editor']);
      const unique = new Set(permissions);
      expect(unique.size).toBe(permissions.length);
      expect(permissions).toContain(Permissions.EntityCreate);
    });

    it('ignores unknown role names', () => {
      expect(expandRoles(['superuser', 'root'])).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('grants exact matches', () => {
      expect(hasPermission([Permissions.EntityRead], Permissions.EntityRead)).toBe(true);
    });

    it('denies missing permissions', () => {
      expect(hasPermission([Permissions.EntityRead], Permissions.EntityDelete)).toBe(false);
    });

    it('grants everything via wildcard', () => {
      expect(hasPermission([PERMISSION_WILDCARD], Permissions.EntityDelete)).toBe(true);
      expect(hasPermission([PERMISSION_WILDCARD], 'anything.at_all')).toBe(true);
    });

    it('grants resource.* prefix permissions', () => {
      expect(hasPermission(['entity.*'], Permissions.EntityDelete)).toBe(true);
      expect(hasPermission(['entity.*'], Permissions.RelationshipWrite)).toBe(false);
    });

    it('denies on empty permission set', () => {
      expect(hasPermission([], Permissions.EntityRead)).toBe(false);
    });
  });

  describe('normalizePermissions', () => {
    it('expands role names mixed into a permission list', () => {
      const normalized = normalizePermissions(['viewer']);
      expect(normalized).toEqual([...ROLE_PERMISSIONS.viewer]);
    });

    it('keeps explicit permission strings', () => {
      expect(normalizePermissions([Permissions.EntityRead, 'custom.thing'])).toEqual([
        Permissions.EntityRead,
        'custom.thing',
      ]);
    });

    it('mixes roles and explicit permissions', () => {
      const normalized = normalizePermissions(['viewer', Permissions.EntityCreate]);
      expect(normalized).toContain(Permissions.EntityRead);
      expect(normalized).toContain(Permissions.EntityCreate);
    });
  });

  describe('isRoleName', () => {
    it('recognizes built-in roles', () => {
      expect(isRoleName('admin')).toBe(true);
      expect(isRoleName('editor')).toBe(true);
      expect(isRoleName('viewer')).toBe(true);
      expect(isRoleName('entity.read')).toBe(false);
    });
  });
});
