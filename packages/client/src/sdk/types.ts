/**
 * Trellis Client SDK - Type Definitions
 *
 * SDK-specific types that extend kernel types for client-side usage.
 */

import type {
  EntityId,
  TenantId,
  ActorId,
  Entity,
  Relationship,
  RelationshipType,
  KernelEvent,
  EventType,
  FilterOperator,
  KernelError,
} from '@trellis/kernel';

// =============================================================================
// CLIENT CONFIGURATION
// =============================================================================

/**
 * Configuration for TrellisClient.
 */
export interface ClientConfig {
  /** Base URL for HTTP API (e.g., "http://localhost:3000") */
  readonly baseUrl: string;

  /** WebSocket URL (defaults to baseUrl with ws:// protocol) */
  readonly wsUrl?: string;

  /** Callback when token expires and refresh fails */
  readonly onAuthError?: (error: AuthError) => void;

  /** Token storage strategy */
  readonly storage?: TokenStorage;

  /** Request timeout in milliseconds (default: 30000) */
  readonly timeout?: number;

  /** Enable automatic token refresh (default: true) */
  readonly autoRefresh?: boolean;

  /** WebSocket auto-reconnect (default: true) */
  readonly autoReconnect?: boolean;

  /** Maximum reconnection attempts (default: 10) */
  readonly maxReconnectAttempts?: number;
}

/**
 * Token storage interface for custom storage implementations.
 */
export interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Token pair returned by login/refresh.
 */
export interface TokenPair {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly token_type: 'Bearer';
}

/**
 * Authentication error.
 */
export interface AuthError {
  readonly code: 'AUTH_FAILED' | 'TOKEN_EXPIRED' | 'REFRESH_FAILED';
  readonly message: string;
}

/**
 * Login credentials for development mode.
 */
export interface LoginCredentials {
  readonly tenant_id: string;
  readonly actor_id: string;
  readonly roles?: readonly string[];
  readonly permissions?: readonly string[];
}

/**
 * Current authentication state.
 */
export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly tenantId: TenantId | null;
  readonly actorId: ActorId | null;
  readonly expiresAt: number | null;
}

// =============================================================================
// ENTITY OPERATIONS
// =============================================================================

/**
 * Options for getting an entity.
 */
export interface GetEntityOptions {
  /** Resolve inherited properties to their values */
  readonly resolveInherited?: boolean;
  /** Evaluate computed properties */
  readonly evaluateComputed?: boolean;
  /** Include relationships of these types */
  readonly includeRelationships?: readonly RelationshipType[];
}

/**
 * Options for deleting an entity.
 */
export interface DeleteEntityOptions {
  /** Also delete relationships (default: true) */
  readonly cascadeRelationships?: boolean;
  /** Hard delete instead of soft delete */
  readonly hardDelete?: boolean;
}

// =============================================================================
// RELATIONSHIP OPERATIONS
// =============================================================================

/**
 * Options for listing relationships.
 */
export interface ListRelationshipsOptions {
  /** Filter by relationship type */
  readonly type?: RelationshipType;
  /** Filter by direction */
  readonly direction?: 'outgoing' | 'incoming' | 'both';
  /** Include the related entity objects */
  readonly includeEntities?: boolean;
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Query options for useQuery hook.
 */
export interface QueryOptions {
  /** Filter conditions */
  readonly filter?: QueryFilter;
  /** Sort specifications */
  readonly sort?: readonly SortOption[];
  /** Page size (default: 50) */
  readonly limit?: number;
  /** Include total count */
  readonly includeTotal?: boolean;
  /** Skip initial fetch */
  readonly skip?: boolean;
}

/**
 * Simplified filter for hooks.
 */
export interface QueryFilter {
  readonly [path: string]: unknown | FilterCondition;
}

/**
 * Filter condition with operator.
 */
export interface FilterCondition {
  readonly operator: FilterOperator;
  readonly value: unknown;
}

/**
 * Sort option for queries.
 */
export interface SortOption {
  readonly path: string;
  readonly direction?: 'asc' | 'desc';
  readonly nulls?: 'first' | 'last';
}

/**
 * Pagination info returned with query results.
 */
export interface PaginationInfo {
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly cursor?: string | undefined;
  readonly totalCount?: number | undefined;
}

/**
 * Query result with pagination.
 */
export interface QueryResult<T> {
  readonly data: readonly T[];
  readonly pagination: PaginationInfo;
}

// =============================================================================
// WEBSOCKET / SUBSCRIPTIONS
// =============================================================================

/**
 * Subscription filter for real-time events.
 */
export interface SubscriptionFilter {
  /** Filter by entity type (e.g., "product", "product.variant") */
  readonly entityType?: string;
  /** Filter by specific entity ID */
  readonly entityId?: EntityId;
  /** Filter by event types */
  readonly eventTypes?: readonly EventType[];
}

/**
 * Active subscription handle.
 */
export interface Subscription {
  /** Unique subscription ID */
  readonly id: string;
  /** Unsubscribe from events */
  readonly unsubscribe: () => void;
}

/**
 * WebSocket connection state.
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting';

/**
 * WebSocket event handlers.
 */
export interface WebSocketEvents {
  readonly onConnected?: () => void;
  readonly onDisconnected?: (reason?: string) => void;
  readonly onError?: (error: Error) => void;
  readonly onReconnecting?: (attempt: number) => void;
  readonly onEvent?: (event: KernelEvent, subscriptionId: string) => void;
}

// =============================================================================
// REACT STATE
// =============================================================================

/**
 * Result from useEntity hook.
 */
export interface UseEntityResult {
  readonly data: Entity | null;
  readonly loading: boolean;
  readonly error: KernelError | null;
  readonly refetch: () => Promise<void>;
}

/**
 * Result from useQuery hook.
 */
export interface UseQueryResult<T = Entity> {
  readonly data: readonly T[];
  readonly loading: boolean;
  readonly error: KernelError | null;
  readonly pagination: PaginationInfo | null;
  readonly refetch: () => Promise<void>;
  readonly fetchMore: () => Promise<void>;
}

/**
 * Result from useMutation hooks.
 */
export interface UseMutationResult<TData, TInput> {
  readonly mutate: (input: TInput) => Promise<TData>;
  readonly loading: boolean;
  readonly error: KernelError | null;
  readonly data: TData | null;
  readonly reset: () => void;
}

// =============================================================================
// CACHE
// =============================================================================

/**
 * Cache entry with metadata.
 */
export interface CacheEntry<T> {
  readonly data: T;
  readonly fetchedAt: number;
  readonly expiresAt: number;
}

/**
 * Cache configuration.
 */
export interface CacheConfig {
  /** Default TTL in milliseconds (default: 60000) */
  readonly defaultTtl?: number;
  /** Maximum cache entries (default: 1000) */
  readonly maxEntries?: number;
  /** Enable cache (default: true) */
  readonly enabled?: boolean;
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * HTTP request options.
 */
export interface RequestOptions {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly body?: unknown;
  readonly params?: Record<string, string | number | boolean | undefined>;
  readonly headers?: Record<string, string>;
  readonly skipAuth?: boolean;
}

/**
 * HTTP response wrapper.
 */
export interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Headers;
}

/**
 * SDK error with additional context.
 */
export class TrellisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TrellisError';
  }

  static fromKernelError(error: KernelError): TrellisError {
    return new TrellisError(error.message, error.code, error.details);
  }
}
