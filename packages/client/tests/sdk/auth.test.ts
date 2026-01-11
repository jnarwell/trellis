/**
 * Tests for AuthManager and TokenStorage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AuthManager,
  MemoryTokenStorage,
  LocalStorageTokenStorage,
} from '../../src/sdk/auth.js';
import type { HttpClient } from '../../src/sdk/http.js';

describe('MemoryTokenStorage', () => {
  let storage: MemoryTokenStorage;

  beforeEach(() => {
    storage = new MemoryTokenStorage();
  });

  it('should return null for unset tokens', () => {
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('should store and retrieve tokens', () => {
    storage.setTokens('access', 'refresh');

    expect(storage.getAccessToken()).toBe('access');
    expect(storage.getRefreshToken()).toBe('refresh');
  });

  it('should clear tokens', () => {
    storage.setTokens('access', 'refresh');
    storage.clearTokens();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });
});

describe('LocalStorageTokenStorage', () => {
  let storage: LocalStorageTokenStorage;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockLocalStorage = {};

    // Mock both window and localStorage
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
    });

    storage = new LocalStorageTokenStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return null for unset tokens', () => {
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('should store and retrieve tokens', () => {
    storage.setTokens('access', 'refresh');

    expect(storage.getAccessToken()).toBe('access');
    expect(storage.getRefreshToken()).toBe('refresh');
  });

  it('should clear tokens', () => {
    storage.setTokens('access', 'refresh');
    storage.clearTokens();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });
});

describe('AuthManager', () => {
  let auth: AuthManager;
  let storage: MemoryTokenStorage;
  let mockHttp: HttpClient;

  beforeEach(() => {
    storage = new MemoryTokenStorage();
    mockHttp = {
      postUnauthenticated: vi.fn(),
    } as unknown as HttpClient;
    auth = new AuthManager(storage, false);
    auth.setHttpClient(mockHttp);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should not be authenticated initially', () => {
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should have null tenant and actor', () => {
      expect(auth.getTenantId()).toBeNull();
      expect(auth.getActorId()).toBeNull();
    });

    it('should return correct initial state', () => {
      const state = auth.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.tenantId).toBeNull();
      expect(state.actorId).toBeNull();
      expect(state.expiresAt).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      await auth.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getTenantId()).toBe('tenant-1');
      expect(auth.getActorId()).toBe('actor-1');
      expect(storage.getAccessToken()).toBe('access-token');
      expect(storage.getRefreshToken()).toBe('refresh-token');
    });

    it('should store tokens in storage', async () => {
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      await auth.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      expect(storage.getAccessToken()).toBe('access-token');
      expect(storage.getRefreshToken()).toBe('refresh-token');
    });

    it('should throw if http client not set', async () => {
      const authWithoutHttp = new AuthManager(storage);

      await expect(
        authWithoutHttp.login({
          tenant_id: 'tenant-1',
          actor_id: 'actor-1',
        })
      ).rejects.toThrow('HTTP client not initialized');
    });
  });

  describe('logout', () => {
    it('should clear auth state', async () => {
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      await auth.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      auth.logout();

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getTenantId()).toBeNull();
      expect(auth.getActorId()).toBeNull();
      expect(storage.getAccessToken()).toBeNull();
    });
  });

  describe('token refresh', () => {
    it('should refresh token', async () => {
      // Initial login
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        access_token: 'access-token-1',
        refresh_token: 'refresh-token-1',
        expires_in: 900,
        token_type: 'Bearer',
      });

      await auth.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      // Refresh
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        access_token: 'access-token-2',
        refresh_token: 'refresh-token-2',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await auth.refreshToken();

      expect(result).toBe(true);
      expect(storage.getAccessToken()).toBe('access-token-2');
    });

    it('should return false if no refresh token', async () => {
      const result = await auth.refreshToken();

      expect(result).toBe(false);
    });

    it('should call onAuthError on refresh failure', async () => {
      const onAuthError = vi.fn();
      const authWithCallback = new AuthManager(storage, false, onAuthError);
      authWithCallback.setHttpClient(mockHttp);

      // Initial login
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      await authWithCallback.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      // Failed refresh
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Refresh failed')
      );

      await authWithCallback.refreshToken();

      expect(onAuthError).toHaveBeenCalledWith({
        code: 'REFRESH_FAILED',
        message: 'Refresh failed',
      });
    });
  });

  describe('auto refresh', () => {
    it('should schedule refresh before expiry', async () => {
      const authWithAutoRefresh = new AuthManager(storage, true);
      authWithAutoRefresh.setHttpClient(mockHttp);

      // Login with 5 minute expiry
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 300, // 5 minutes
        token_type: 'Bearer',
      });

      await authWithAutoRefresh.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      // Advance time to just before refresh threshold (2 minutes before expiry)
      // 300s - 120s = 180s = 3 minutes
      vi.advanceTimersByTime(180000);

      // Refresh should be called
      expect(mockHttp.postUnauthenticated).toHaveBeenCalledTimes(2);
    });
  });

  describe('expiry check', () => {
    it('should report not authenticated when token expired', async () => {
      (mockHttp.postUnauthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 10, // 10 seconds
        token_type: 'Bearer',
      });

      await auth.login({
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      expect(auth.isAuthenticated()).toBe(true);

      // Advance past expiry
      vi.advanceTimersByTime(11000);

      expect(auth.isAuthenticated()).toBe(false);
    });
  });
});
