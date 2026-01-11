/**
 * Trellis Server - Authentication Types
 *
 * Type definitions for JWT-based authentication.
 */

/**
 * JWT access token payload.
 *
 * Contains the claims embedded in the access token.
 */
export interface JWTPayload {
  /** Subject - the actor (user) ID */
  readonly sub: string;

  /** Tenant ID the user belongs to */
  readonly tenant_id: string;

  /** User roles (e.g., 'admin', 'editor', 'viewer') */
  readonly roles: readonly string[];

  /** Explicit permission grants */
  readonly permissions: readonly string[];

  /** Issued at timestamp (Unix seconds) */
  readonly iat: number;

  /** Expiration timestamp (Unix seconds) */
  readonly exp: number;

  /** Issuer */
  readonly iss?: string;

  /** Audience */
  readonly aud?: string;
}

/**
 * JWT refresh token payload.
 *
 * Minimal payload for refresh tokens - only contains what's needed
 * to issue a new access token.
 */
export interface RefreshTokenPayload {
  /** Subject - the actor (user) ID */
  readonly sub: string;

  /** Tenant ID */
  readonly tenant_id: string;

  /** Token type marker */
  readonly type: 'refresh';

  /** Issued at timestamp */
  readonly iat: number;

  /** Expiration timestamp */
  readonly exp: number;
}

/**
 * Token pair returned from login/refresh.
 */
export interface TokenPair {
  /** Access token (short-lived) */
  readonly access_token: string;

  /** Refresh token (long-lived) */
  readonly refresh_token: string;

  /** Access token type (always 'Bearer') */
  readonly token_type: 'Bearer';

  /** Access token expiry in seconds */
  readonly expires_in: number;
}

/**
 * Login request body (development only).
 */
export interface LoginRequest {
  /** Tenant ID to authenticate as */
  readonly tenant_id: string;

  /** Actor ID to authenticate as */
  readonly actor_id: string;

  /** Roles to include in token */
  readonly roles?: readonly string[];

  /** Permissions to include in token */
  readonly permissions?: readonly string[];
}

/**
 * Refresh request body.
 */
export interface RefreshRequest {
  /** The refresh token */
  readonly refresh_token: string;
}

/**
 * Authentication error response.
 */
export interface AuthError {
  readonly code: 'UNAUTHORIZED';
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Create an authentication error.
 */
export function createAuthError(message: string, details?: Record<string, unknown>): AuthError {
  const error: AuthError = {
    code: 'UNAUTHORIZED',
    message,
  };

  if (details !== undefined) {
    return { ...error, details };
  }

  return error;
}
