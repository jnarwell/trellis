/**
 * Trellis Server - Token Generation
 *
 * Functions for generating JWT tokens.
 * Used for development/testing and the login endpoint.
 */

import jwt from 'jsonwebtoken';
import { getAuthConfig } from '../config/auth.js';
import type { TokenPair, JWTPayload, RefreshTokenPayload } from './types.js';

/** JWT duration string type (e.g., '1h', '7d') */
type JWTDuration = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

/**
 * Options for generating an access token.
 */
export interface GenerateAccessTokenOptions {
  /** Actor (user) ID */
  readonly actorId: string;

  /** Tenant ID */
  readonly tenantId: string;

  /** User roles */
  readonly roles?: readonly string[];

  /** Explicit permissions */
  readonly permissions?: readonly string[];
}

/**
 * Generate an access token.
 *
 * @param options - Token generation options
 * @returns The signed JWT token
 */
export function generateAccessToken(options: GenerateAccessTokenOptions): string {
  const config = getAuthConfig();

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: options.actorId,
    tenant_id: options.tenantId,
    roles: options.roles ?? [],
    permissions: options.permissions ?? [],
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiry as JWTDuration,
    issuer: config.issuer,
    audience: config.audience,
  });
}

/**
 * Options for generating a refresh token.
 */
export interface GenerateRefreshTokenOptions {
  /** Actor (user) ID */
  readonly actorId: string;

  /** Tenant ID */
  readonly tenantId: string;
}

/**
 * Generate a refresh token.
 *
 * @param options - Token generation options
 * @returns The signed refresh token
 */
export function generateRefreshToken(options: GenerateRefreshTokenOptions): string {
  const config = getAuthConfig();

  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    sub: options.actorId,
    tenant_id: options.tenantId,
    type: 'refresh',
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.refreshExpiry as JWTDuration,
    issuer: config.issuer,
  });
}

/**
 * Parse a duration string (e.g., '1h', '7d') to seconds.
 */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    // Default to 1 hour if unparseable
    return 3600;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 3600;
  }
}

/**
 * Options for generating a token pair.
 */
export interface GenerateTokenPairOptions {
  /** Actor (user) ID */
  readonly actorId: string;

  /** Tenant ID */
  readonly tenantId: string;

  /** User roles */
  readonly roles?: readonly string[];

  /** Explicit permissions */
  readonly permissions?: readonly string[];
}

/**
 * Generate both access and refresh tokens.
 *
 * @param options - Token generation options
 * @returns A token pair with both tokens
 */
export function generateTokenPair(options: GenerateTokenPairOptions): TokenPair {
  const config = getAuthConfig();

  const accessToken = generateAccessToken({
    actorId: options.actorId,
    tenantId: options.tenantId,
    roles: options.roles ?? [],
    permissions: options.permissions ?? [],
  });

  const refreshToken = generateRefreshToken({
    actorId: options.actorId,
    tenantId: options.tenantId,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: parseDurationToSeconds(config.jwtExpiry),
  };
}
