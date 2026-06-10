/**
 * Trellis Kernel - Auth (roles and permissions)
 */

export {
  PERMISSION_WILDCARD,
  Permissions,
  ROLE_PERMISSIONS,
  isRoleName,
  expandRoles,
  hasPermission,
  normalizePermissions,
} from './roles.js';

export type { Permission, RoleName } from './roles.js';
