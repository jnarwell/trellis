/**
 * Trellis Client SDK - Main Client
 *
 * TrellisClient provides a unified interface for the Trellis API.
 */

import type {
  Entity,
  EntityId,
  Relationship,
  CreateEntityInput,
  UpdateEntityInput,
  CreateRelationshipInput,
  KernelEvent,
} from '@trellis/kernel';
import type {
  ClientConfig,
  TokenStorage,
  AuthState,
  LoginCredentials,
  GetEntityOptions,
  DeleteEntityOptions,
  ListRelationshipsOptions,
  SubscriptionFilter,
  Subscription,
  ConnectionState,
  WebSocketEvents,
} from './types.js';
import { HttpClient } from './http.js';
import { AuthManager, MemoryTokenStorage } from './auth.js';
import { EntityApi } from './entities.js';
import { RelationshipApi } from './relationships.js';
import { QueryBuilder, QueryApi } from './queries.js';
import { WebSocketClient } from './websocket.js';

/**
 * Default client configuration.
 */
const DEFAULT_CONFIG = {
  timeout: 30000,
  autoRefresh: true,
  autoReconnect: true,
  maxReconnectAttempts: 10,
} as const;

/**
 * Trellis API client.
 *
 * @example
 * ```typescript
 * const client = new TrellisClient({
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * await client.login({ tenant_id: '...', actor_id: '...' });
 *
 * const entity = await client.createEntity({
 *   type: 'product',
 *   properties: {
 *     name: { source: 'literal', value: { type: 'text', value: 'Widget' } },
 *   },
 * });
 *
 * const products = await client
 *   .query('product')
 *   .where('status', 'eq', 'active')
 *   .limit(50)
 *   .execute();
 * ```
 */
export class TrellisClient {
  private readonly config: Required<Omit<ClientConfig, 'onAuthError' | 'storage'>> & {
    onAuthError?: ClientConfig['onAuthError'];
    storage: TokenStorage;
  };
  private readonly auth: AuthManager;
  private readonly http: HttpClient;
  private readonly entities: EntityApi;
  private readonly relationships: RelationshipApi;
  private readonly queries: QueryApi;
  private ws: WebSocketClient | null = null;
  private wsEvents: WebSocketEvents = {};

  constructor(config: ClientConfig) {
    // Build full config
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      wsUrl: config.wsUrl ?? this.deriveWsUrl(config.baseUrl),
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      autoRefresh: config.autoRefresh ?? DEFAULT_CONFIG.autoRefresh,
      autoReconnect: config.autoReconnect ?? DEFAULT_CONFIG.autoReconnect,
      maxReconnectAttempts:
        config.maxReconnectAttempts ?? DEFAULT_CONFIG.maxReconnectAttempts,
      onAuthError: config.onAuthError,
      storage: config.storage ?? new MemoryTokenStorage(),
    };

    // Initialize auth manager
    this.auth = new AuthManager(
      this.config.storage,
      this.config.autoRefresh,
      this.config.onAuthError
    );

    // Initialize HTTP client
    this.http = new HttpClient({
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      tokenStorage: this.config.storage,
      onTokenExpired: () => this.auth.refreshToken(),
    });

    // Set HTTP client on auth manager
    this.auth.setHttpClient(this.http);

    // Initialize API clients
    this.entities = new EntityApi(this.http);
    this.relationships = new RelationshipApi(this.http);
    this.queries = new QueryApi(this.http);
  }

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  /**
   * Login with credentials (development only).
   */
  async login(credentials: LoginCredentials): Promise<void> {
    await this.auth.login(credentials);
  }

  /**
   * Refresh the access token.
   */
  async refreshToken(): Promise<boolean> {
    return this.auth.refreshToken();
  }

  /**
   * Logout and clear tokens.
   */
  logout(): void {
    this.auth.logout();
    this.ws?.disconnect();
  }

  /**
   * Get current authentication state.
   */
  getAuthState(): AuthState {
    return this.auth.getState();
  }

  /**
   * Check if currently authenticated.
   */
  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  // ===========================================================================
  // ENTITY OPERATIONS
  // ===========================================================================

  /**
   * Create a new entity.
   */
  async createEntity(input: CreateEntityInput): Promise<Entity> {
    return this.entities.create(input);
  }

  /**
   * Get an entity by ID.
   */
  async getEntity(id: EntityId, options?: GetEntityOptions): Promise<Entity | null> {
    return this.entities.get(id, options);
  }

  /**
   * Update an entity.
   */
  async updateEntity(input: UpdateEntityInput): Promise<Entity> {
    return this.entities.update(input);
  }

  /**
   * Delete an entity.
   */
  async deleteEntity(id: EntityId, options?: DeleteEntityOptions): Promise<void> {
    return this.entities.delete(id, options);
  }

  // ===========================================================================
  // RELATIONSHIP OPERATIONS
  // ===========================================================================

  /**
   * Create a new relationship.
   */
  async createRelationship(input: CreateRelationshipInput): Promise<Relationship> {
    return this.relationships.create(input);
  }

  /**
   * Delete a relationship.
   */
  async deleteRelationship(id: string): Promise<void> {
    return this.relationships.delete(id);
  }

  /**
   * List relationships for an entity.
   */
  async listRelationships(
    entityId: EntityId,
    options?: ListRelationshipsOptions
  ): Promise<readonly Relationship[]> {
    return this.relationships.list(entityId, options);
  }

  // ===========================================================================
  // QUERY OPERATIONS
  // ===========================================================================

  /**
   * Create a query builder.
   *
   * @example
   * ```typescript
   * const products = await client
   *   .query('product')
   *   .where('status', 'eq', 'active')
   *   .orderBy('name')
   *   .limit(50)
   *   .execute();
   * ```
   */
  query(type?: string): QueryBuilder {
    return this.queries.query(type);
  }

  // ===========================================================================
  // WEBSOCKET / REAL-TIME
  // ===========================================================================

  /**
   * Connect to WebSocket server for real-time events.
   */
  async connect(): Promise<void> {
    if (!this.ws) {
      this.ws = new WebSocketClient({
        url: this.config.wsUrl,
        autoReconnect: this.config.autoReconnect,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        getAuthCredentials: () => {
          const tenantId = this.auth.getTenantId();
          const actorId = this.auth.getActorId();
          if (tenantId && actorId) {
            return { tenantId, actorId };
          }
          return null;
        },
        events: this.wsEvents,
      });
    }

    await this.ws.connect();
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    this.ws?.disconnect();
  }

  /**
   * Get WebSocket connection state.
   */
  getConnectionState(): ConnectionState {
    return this.ws?.getState() ?? 'disconnected';
  }

  /**
   * Subscribe to real-time events.
   *
   * @example
   * ```typescript
   * const subscription = await client.subscribe(
   *   { entityType: 'product' },
   *   (event) => {
   *     console.log('Event received:', event);
   *   }
   * );
   *
   * // Later...
   * subscription.unsubscribe();
   * ```
   */
  async subscribe(
    filter: SubscriptionFilter,
    callback: (event: KernelEvent) => void
  ): Promise<Subscription> {
    if (!this.ws) {
      await this.connect();
    }
    return this.ws!.subscribe(filter, callback);
  }

  /**
   * Register WebSocket event handlers.
   *
   * @example
   * ```typescript
   * client.on('connected', () => console.log('Connected!'));
   * client.on('disconnected', (reason) => console.log('Disconnected:', reason));
   * client.on('error', (error) => console.error('Error:', error));
   * ```
   */
  on<K extends keyof WebSocketEvents>(
    event: K,
    handler: NonNullable<WebSocketEvents[K]>
  ): void {
    this.wsEvents[event] = handler as WebSocketEvents[K];
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Derive WebSocket URL from HTTP URL.
   * Handles both absolute URLs and relative paths (e.g., '/api').
   */
  private deriveWsUrl(httpUrl: string): string {
    // For relative URLs, use window.location.origin as base
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const url = new URL(httpUrl, base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    return url.toString();
  }
}
