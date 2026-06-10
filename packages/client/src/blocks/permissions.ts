/**
 * Trellis Blocks - Permission Gating
 *
 * UX-level permission checks for block actions (ADR-012). The server is
 * authoritative; these checks only hide/disable controls the user cannot
 * successfully invoke.
 */

import { hasPermission } from '@trellis/kernel';
import type { BindingScope } from '../binding/scope.js';

/**
 * Check whether the scope's user holds a permission.
 *
 * Actions without a `permission` field are always allowed.
 */
export function canPerform(
  scope: BindingScope | undefined,
  permission: string | undefined
): boolean {
  if (!permission) return true;
  const user = scope?.user as
    | { permissions?: readonly string[] }
    | undefined;
  return hasPermission(user?.permissions ?? [], permission);
}
