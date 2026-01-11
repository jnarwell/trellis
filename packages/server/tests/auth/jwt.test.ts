/**
 * JWT Authentication Tests
 *
 * Tests for JWT token generation and verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
} from '../../src/auth/index.js';
import { resetAuthConfig } from '../../src/config/auth.js';

describe('JWT Authentication', () => {
  beforeEach(() => {
    // Reset config before each test
    resetAuthConfig();
    // Ensure we're in test environment
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_SECRET', 'test-secret-key');
    vi.stubEnv('JWT_EXPIRY', '1h');
    vi.stubEnv('REFRESH_EXPIRY', '7d');
    vi.stubEnv('JWT_ISSUER', 'trellis-test');
    vi.stubEnv('JWT_AUDIENCE', 'trellis-api-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAuthConfig();
  });

  describe('generateAccessToken', () => {
    it('generates a valid JWT token', () => {
      const token = generateAccessToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        roles: ['admin'],
        permissions: ['read:entities', 'write:entities'],
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('includes correct claims in token', () => {
      const actorId = '123e4567-e89b-12d3-a456-426614174000';
      const tenantId = '223e4567-e89b-12d3-a456-426614174000';
      const roles = ['admin', 'editor'];
      const permissions = ['read:entities'];

      const token = generateAccessToken({
        actorId,
        tenantId,
        roles,
        permissions,
      });

      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded['sub']).toBe(actorId);
      expect(decoded['tenant_id']).toBe(tenantId);
      expect(decoded['roles']).toEqual(roles);
      expect(decoded['permissions']).toEqual(permissions);
      expect(decoded['iss']).toBe('trellis-test');
      expect(decoded['aud']).toBe('trellis-api-test');
      expect(decoded['iat']).toBeDefined();
      expect(decoded['exp']).toBeDefined();
    });

    it('defaults roles and permissions to empty arrays', () => {
      const token = generateAccessToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded['roles']).toEqual([]);
      expect(decoded['permissions']).toEqual([]);
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a valid refresh token', () => {
      const token = generateRefreshToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('includes type marker in refresh token', () => {
      const token = generateRefreshToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded['type']).toBe('refresh');
    });
  });

  describe('generateTokenPair', () => {
    it('generates both access and refresh tokens', () => {
      const pair = generateTokenPair({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      expect(pair.access_token).toBeDefined();
      expect(pair.refresh_token).toBeDefined();
      expect(pair.token_type).toBe('Bearer');
      expect(pair.expires_in).toBe(3600); // 1h = 3600 seconds
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies valid token successfully', () => {
      const token = generateAccessToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
        roles: ['admin'],
        permissions: ['read:entities'],
      });

      const result = verifyAccessToken(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.sub).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.payload.tenant_id).toBe('223e4567-e89b-12d3-a456-426614174000');
        expect(result.payload.roles).toEqual(['admin']);
        expect(result.payload.permissions).toEqual(['read:entities']);
      }
    });

    it('rejects token with invalid signature', () => {
      const token = jwt.sign(
        { sub: 'test', tenant_id: 'test' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const result = verifyAccessToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid token');
      }
    });

    it('rejects expired token', () => {
      // Create an already-expired token
      const token = jwt.sign(
        {
          sub: '123e4567-e89b-12d3-a456-426614174000',
          tenant_id: '223e4567-e89b-12d3-a456-426614174000',
          roles: [],
          permissions: [],
        },
        'test-secret-key',
        {
          expiresIn: '-1s',
          issuer: 'trellis-test',
          audience: 'trellis-api-test',
        }
      );

      const result = verifyAccessToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Token has expired');
      }
    });

    it('rejects token missing subject claim', () => {
      const token = jwt.sign(
        { tenant_id: 'test', roles: [], permissions: [] },
        'test-secret-key',
        { issuer: 'trellis-test', audience: 'trellis-api-test' }
      );

      const result = verifyAccessToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Token missing subject claim');
      }
    });

    it('rejects token missing tenant_id claim', () => {
      const token = jwt.sign(
        { sub: 'test', roles: [], permissions: [] },
        'test-secret-key',
        { issuer: 'trellis-test', audience: 'trellis-api-test' }
      );

      const result = verifyAccessToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Token missing tenant_id claim');
      }
    });

    it('rejects malformed token', () => {
      const result = verifyAccessToken('not.a.valid.token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid token');
      }
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies valid refresh token', () => {
      const token = generateRefreshToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      const result = verifyRefreshToken(token);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payload.sub).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(result.payload.tenant_id).toBe('223e4567-e89b-12d3-a456-426614174000');
        expect(result.payload.type).toBe('refresh');
      }
    });

    it('rejects access token as refresh token', () => {
      const token = generateAccessToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      const result = verifyRefreshToken(token);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Invalid token type');
      }
    });
  });

  describe('decodeToken', () => {
    it('decodes token without verification', () => {
      const token = generateAccessToken({
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '223e4567-e89b-12d3-a456-426614174000',
      });

      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('returns null for invalid token', () => {
      const decoded = decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });
  });
});
