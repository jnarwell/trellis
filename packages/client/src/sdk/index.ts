/**
 * Trellis Client SDK
 *
 * TypeScript SDK for the Trellis API.
 */

// Main client
export { TrellisClient } from './client.js';

// Types
export type {
  ClientConfig,
  TokenStorage,
  TokenPair,
  AuthError,
  LoginCredentials,
  AuthState,
  GetEntityOptions,
  DeleteEntityOptions,
  ListRelationshipsOptions,
  QueryOptions,
  QueryFilter,
  FilterCondition,
  SortOption,
  PaginationInfo,
  QueryResult,
  SubscriptionFilter,
  Subscription,
  ConnectionState,
  WebSocketEvents,
  UseEntityResult,
  UseQueryResult,
  UseMutationResult,
  CacheConfig,
  CacheEntry,
  RequestOptions,
  ApiResponse,
} from './types.js';

export { TrellisError } from './types.js';

// Auth utilities
export { MemoryTokenStorage, LocalStorageTokenStorage } from './auth.js';

// Query builder (for advanced usage)
export { QueryBuilder } from './queries.js';
