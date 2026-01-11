/**
 * Trellis Server - Authentication Configuration
 *
 * Configuration for JWT-based authentication.
 */

/**
 * Authentication configuration.
 */
export interface AuthConfig {
  /** Secret key for signing JWTs */
  readonly jwtSecret: string;

  /** Access token expiry (e.g., '1h', '15m') */
  readonly jwtExpiry: string;

  /** Refresh token expiry (e.g., '7d', '30d') */
  readonly refreshExpiry: string;

  /** Issuer claim for tokens */
  readonly issuer: string;

  /** Audience claim for tokens */
  readonly audience: string;
}

/**
 * Load authentication configuration from environment variables.
 */
export function loadAuthConfig(): AuthConfig {
  const jwtSecret = process.env['JWT_SECRET'];

  // In production, JWT_SECRET must be explicitly set
  if (process.env['NODE_ENV'] === 'production' && !jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return {
    jwtSecret: jwtSecret ?? 'dev-secret-do-not-use-in-production',
    jwtExpiry: process.env['JWT_EXPIRY'] ?? '1h',
    refreshExpiry: process.env['REFRESH_EXPIRY'] ?? '7d',
    issuer: process.env['JWT_ISSUER'] ?? 'trellis',
    audience: process.env['JWT_AUDIENCE'] ?? 'trellis-api',
  };
}

/** Cached auth configuration */
let cachedConfig: AuthConfig | null = null;

/**
 * Get the authentication configuration (cached).
 */
export function getAuthConfig(): AuthConfig {
  if (!cachedConfig) {
    cachedConfig = loadAuthConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (for testing).
 */
export function resetAuthConfig(): void {
  cachedConfig = null;
}
