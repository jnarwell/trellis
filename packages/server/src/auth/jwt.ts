/**
 * Trellis Server - JWT Verification
 *
 * Functions for verifying JWT tokens.
 */

import jwt from 'jsonwebtoken';
import { getAuthConfig } from '../config/auth.js';
import type { JWTPayload, RefreshTokenPayload } from './types.js';

/**
 * Result of JWT verification.
 */
export type VerifyResult<T> =
  | { success: true; payload: T }
  | { success: false; error: string };

/**
 * Verify and decode an access token.
 *
 * @param token - The JWT token string
 * @returns The decoded payload or an error
 */
export function verifyAccessToken(token: string): VerifyResult<JWTPayload> {
  const config = getAuthConfig();

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
    }) as JWTPayload;

    // Validate required claims
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return { success: false, error: 'Token missing subject claim' };
    }

    if (typeof payload.tenant_id !== 'string' || payload.tenant_id.length === 0) {
      return { success: false, error: 'Token missing tenant_id claim' };
    }

    // Ensure roles and permissions are arrays
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];

    return {
      success: true,
      payload: {
        ...payload,
        roles,
        permissions,
      },
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Token has expired' };
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Invalid token' };
    }
    if (err instanceof jwt.NotBeforeError) {
      return { success: false, error: 'Token not yet valid' };
    }
    return { success: false, error: 'Token verification failed' };
  }
}

/**
 * Verify and decode a refresh token.
 *
 * @param token - The refresh token string
 * @returns The decoded payload or an error
 */
export function verifyRefreshToken(token: string): VerifyResult<RefreshTokenPayload> {
  const config = getAuthConfig();

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
    }) as RefreshTokenPayload;

    // Validate it's a refresh token
    if (payload.type !== 'refresh') {
      return { success: false, error: 'Invalid token type' };
    }

    // Validate required claims
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      return { success: false, error: 'Token missing subject claim' };
    }

    if (typeof payload.tenant_id !== 'string' || payload.tenant_id.length === 0) {
      return { success: false, error: 'Token missing tenant_id claim' };
    }

    return { success: true, payload };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return { success: false, error: 'Refresh token has expired' };
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return { success: false, error: 'Invalid refresh token' };
    }
    return { success: false, error: 'Refresh token verification failed' };
  }
}

/**
 * Decode a token without verification (for debugging).
 *
 * WARNING: This does not verify the signature. Only use for debugging.
 *
 * @param token - The JWT token string
 * @returns The decoded payload or null if invalid
 */
export function decodeToken(token: string): JWTPayload | RefreshTokenPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      return decoded as JWTPayload | RefreshTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
