/**
 * Trellis Kernel - Error Type Definitions
 *
 * Defines error codes and error interface for the Trellis kernel.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * All kernel error codes.
 */
export type KernelErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'VERSION_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TYPE_MISMATCH'
  | 'PERMISSION_DENIED'
  | 'TENANT_MISMATCH'
  | 'CIRCULAR_DEPENDENCY'
  | 'INVALID_EXPRESSION'
  | 'REFERENCE_BROKEN';

// =============================================================================
// ERROR INTERFACE
// =============================================================================

/**
 * Kernel error structure.
 */
export interface KernelError {
  readonly code: KernelErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}
