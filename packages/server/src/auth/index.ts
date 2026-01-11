/**
 * Trellis Server - Authentication Module
 *
 * JWT-based authentication for the Trellis API.
 */

// Types
export type {
  JWTPayload,
  RefreshTokenPayload,
  TokenPair,
  LoginRequest,
  RefreshRequest,
  AuthError,
} from './types.js';

export { createAuthError } from './types.js';

// JWT verification
export type { VerifyResult } from './jwt.js';
export { verifyAccessToken, verifyRefreshToken, decodeToken } from './jwt.js';

// Token generation
export type {
  GenerateAccessTokenOptions,
  GenerateRefreshTokenOptions,
  GenerateTokenPairOptions,
} from './tokens.js';

export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
} from './tokens.js';

// Re-export config utilities for testing
export { resetAuthConfig } from '../config/auth.js';
