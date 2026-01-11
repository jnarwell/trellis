/**
 * Trellis Client SDK - Authentication Module
 *
 * Token management with automatic refresh.
 */

import type { TenantId, ActorId } from '@trellis/kernel';
import type {
  TokenPair,
  TokenStorage,
  AuthState,
  LoginCredentials,
  AuthError,
} from './types.js';
import { TrellisError } from './types.js';
import type { HttpClient } from './http.js';

/**
 * Minimum time before expiry to trigger refresh (2 minutes).
 */
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Default token storage (in-memory).
 */
export class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

/**
 * LocalStorage token storage.
 */
export class LocalStorageTokenStorage implements TokenStorage {
  private readonly accessTokenKey = 'trellis_access_token';
  private readonly refreshTokenKey = 'trellis_refresh_token';

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.refreshTokenKey);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.accessTokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}

/**
 * Authentication manager.
 */
export class AuthManager {
  private readonly storage: TokenStorage;
  private readonly onAuthError: ((error: AuthError) => void) | undefined;
  private readonly autoRefresh: boolean;
  private httpClient: HttpClient | null = null;

  private tenantId: TenantId | null = null;
  private actorId: ActorId | null = null;
  private expiresAt: number | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    storage: TokenStorage,
    autoRefresh: boolean = true,
    onAuthError: ((error: AuthError) => void) | undefined = undefined
  ) {
    this.storage = storage;
    this.autoRefresh = autoRefresh;
    this.onAuthError = onAuthError;
  }

  /**
   * Set the HTTP client (called after initialization to avoid circular dep).
   */
  setHttpClient(client: HttpClient): void {
    this.httpClient = client;
  }

  /**
   * Get current authentication state.
   */
  getState(): AuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      tenantId: this.tenantId,
      actorId: this.actorId,
      expiresAt: this.expiresAt,
    };
  }

  /**
   * Check if currently authenticated.
   */
  isAuthenticated(): boolean {
    const token = this.storage.getAccessToken();
    if (!token) return false;

    // Check if token is expired
    if (this.expiresAt && Date.now() >= this.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Login with credentials (development only).
   */
  async login(credentials: LoginCredentials): Promise<void> {
    if (!this.httpClient) {
      throw new TrellisError('HTTP client not initialized', 'NOT_INITIALIZED');
    }

    const tokenPair = await this.httpClient.postUnauthenticated<TokenPair>(
      '/auth/login',
      credentials
    );

    this.handleTokenPair(tokenPair, credentials.tenant_id, credentials.actor_id);
  }

  /**
   * Refresh the access token.
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      this.handleAuthError({
        code: 'REFRESH_FAILED',
        message: 'No refresh token available',
      });
      return false;
    }

    if (!this.httpClient) {
      throw new TrellisError('HTTP client not initialized', 'NOT_INITIALIZED');
    }

    try {
      const tokenPair = await this.httpClient.postUnauthenticated<TokenPair>(
        '/auth/refresh',
        { refresh_token: refreshToken }
      );

      this.handleTokenPair(
        tokenPair,
        this.tenantId as string,
        this.actorId as string
      );
      return true;
    } catch (error) {
      this.clearAuth();
      this.handleAuthError({
        code: 'REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Token refresh failed',
      });
      return false;
    }
  }

  /**
   * Logout and clear tokens.
   */
  logout(): void {
    this.clearAuth();
  }

  /**
   * Get the token storage.
   */
  getStorage(): TokenStorage {
    return this.storage;
  }

  /**
   * Get tenant ID for WebSocket auth.
   */
  getTenantId(): string | null {
    return this.tenantId;
  }

  /**
   * Get actor ID for WebSocket auth.
   */
  getActorId(): string | null {
    return this.actorId;
  }

  private handleTokenPair(
    tokenPair: TokenPair,
    tenantId: string,
    actorId: string
  ): void {
    this.storage.setTokens(tokenPair.access_token, tokenPair.refresh_token);
    this.tenantId = tenantId as TenantId;
    this.actorId = actorId as ActorId;
    this.expiresAt = Date.now() + tokenPair.expires_in * 1000;

    if (this.autoRefresh) {
      this.scheduleRefresh(tokenPair.expires_in * 1000);
    }
  }

  private scheduleRefresh(expiresInMs: number): void {
    this.clearRefreshTimer();

    // Schedule refresh before token expires
    const refreshIn = Math.max(expiresInMs - REFRESH_THRESHOLD_MS, 0);

    this.refreshTimer = setTimeout(() => {
      void this.refreshToken();
    }, refreshIn);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private clearAuth(): void {
    this.clearRefreshTimer();
    this.storage.clearTokens();
    this.tenantId = null;
    this.actorId = null;
    this.expiresAt = null;
  }

  private handleAuthError(error: AuthError): void {
    if (this.onAuthError) {
      this.onAuthError(error);
    }
  }
}
