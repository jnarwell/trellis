/**
 * Trellis Client SDK - React Hooks
 *
 * Data fetching and subscription hooks for React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Entity,
  EntityId,
  KernelEvent,
  KernelError,
  CreateEntityInput,
  UpdateEntityInput,
  CreateRelationshipInput,
  Relationship,
  FilterOperator,
} from '@trellis/kernel';
import type {
  UseEntityResult,
  UseQueryResult,
  UseMutationResult,
  GetEntityOptions,
  QueryOptions,
  SubscriptionFilter,
  PaginationInfo,
  QueryResult,
} from '../sdk/types.js';
import { useTrellis, useClient, useCache } from './store.js';

// =============================================================================
// ENTITY HOOKS
// =============================================================================

/**
 * Hook to fetch a single entity by ID.
 *
 * @example
 * ```tsx
 * function ProductDetails({ id }: { id: EntityId }) {
 *   const { data, loading, error, refetch } = useEntity(id);
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!data) return <NotFound />;
 *
 *   return <ProductCard product={data} />;
 * }
 * ```
 */
export function useEntity(
  id: EntityId | null,
  options?: GetEntityOptions
): UseEntityResult {
  const client = useClient();
  const cache = useCache();

  const [data, setData] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState<KernelError | null>(null);

  const fetch = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = cache.getEntity(id);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const entity = await client.getEntity(id, options);
      if (entity) {
        cache.setEntity(entity);
      }
      setData(entity);
    } catch (err) {
      setError(err as KernelError);
    } finally {
      setLoading(false);
    }
  }, [id, client, cache, options]);

  const refetch = useCallback(async () => {
    if (id) {
      cache.invalidateEntity(id);
    }
    await fetch();
  }, [id, cache, fetch]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { data, loading, error, refetch };
}

/**
 * Hook to query entities.
 *
 * @example
 * ```tsx
 * function ProductList() {
 *   const { data, loading, error, pagination, fetchMore } = useQuery('product', {
 *     filter: { status: 'active' },
 *     sort: [{ path: 'name', direction: 'asc' }],
 *     limit: 20,
 *   });
 *
 *   return (
 *     <div>
 *       {data.map(product => <ProductCard key={product.id} product={product} />)}
 *       {pagination?.hasMore && <Button onClick={fetchMore}>Load More</Button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useQuery(
  type: string,
  options: QueryOptions = {}
): UseQueryResult<Entity> {
  const client = useClient();
  const cache = useCache();

  const [data, setData] = useState<readonly Entity[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<KernelError | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const offsetRef = useRef(0);

  const fetch = useCallback(
    async (append = false) => {
      if (options.skip) {
        setLoading(false);
        return;
      }

      // Build query
      let query = client.query(type);

      // Apply filters
      if (options.filter) {
        for (const [path, value] of Object.entries(options.filter)) {
          if (typeof value === 'object' && value !== null && 'operator' in value && 'value' in value) {
            const condition = value as { operator: FilterOperator; value: unknown };
            query = query.where(path, condition.operator, condition.value);
          } else {
            query = query.where(path, 'eq', value);
          }
        }
      }

      // Apply sorting
      if (options.sort) {
        query = query.orderByMultiple(options.sort);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (append) {
        query = query.offset(offsetRef.current);
      }

      if (options.includeTotal) {
        query = query.includeTotal();
      }

      setLoading(true);
      setError(null);

      try {
        const result = await query.execute();

        if (append) {
          setData((prev) => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }

        setPagination(result.pagination);
        offsetRef.current = result.pagination.offset + result.data.length;

        // Cache entities
        for (const entity of result.data) {
          cache.setEntity(entity);
        }
      } catch (err) {
        setError(err as KernelError);
      } finally {
        setLoading(false);
      }
    },
    [client, cache, type, options]
  );

  const refetch = useCallback(async () => {
    offsetRef.current = 0;
    cache.invalidateQueriesForType(type);
    await fetch(false);
  }, [fetch, cache, type]);

  const fetchMore = useCallback(async () => {
    if (pagination?.hasMore && !loading) {
      await fetch(true);
    }
  }, [fetch, pagination, loading]);

  useEffect(() => {
    offsetRef.current = 0;
    void fetch(false);
  }, [fetch]);

  return { data, loading, error, pagination, refetch, fetchMore };
}

// =============================================================================
// SUBSCRIPTION HOOKS
// =============================================================================

/**
 * Hook to subscribe to real-time events.
 *
 * @example
 * ```tsx
 * function ProductUpdates() {
 *   const [events, setEvents] = useState<KernelEvent[]>([]);
 *
 *   useSubscription(
 *     { entityType: 'product' },
 *     (event) => setEvents(prev => [...prev, event])
 *   );
 *
 *   return <EventList events={events} />;
 * }
 * ```
 */
export function useSubscription(
  filter: SubscriptionFilter,
  onEvent: (event: KernelEvent) => void
): void {
  const client = useClient();
  const onEventRef = useRef(onEvent);

  // Keep callback ref updated
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const subscribe = async () => {
      try {
        subscription = await client.subscribe(filter, (event) => {
          onEventRef.current(event);
        });
      } catch (err) {
        // Expected when WebSocket isn't configured - app continues without real-time updates
        console.warn('[Trellis] Subscription unavailable:', (err as Error).message);
      }
    };

    void subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [client, filter.entityType, filter.entityId, filter.eventTypes]);
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Hook for creating entities.
 *
 * @example
 * ```tsx
 * function CreateProductForm() {
 *   const { mutate, loading, error } = useCreateEntity();
 *
 *   const handleSubmit = async (data: FormData) => {
 *     const entity = await mutate({
 *       type: 'product',
 *       properties: { name: { source: 'literal', value: { type: 'text', value: data.name } } }
 *     });
 *     console.log('Created:', entity.id);
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useCreateEntity(): UseMutationResult<Entity, CreateEntityInput> {
  const client = useClient();
  const cache = useCache();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KernelError | null>(null);
  const [data, setData] = useState<Entity | null>(null);

  const mutate = useCallback(
    async (input: CreateEntityInput): Promise<Entity> => {
      setLoading(true);
      setError(null);

      try {
        const entity = await client.createEntity(input);
        cache.setEntity(entity);
        cache.invalidateQueriesForType(input.type);
        setData(entity);
        return entity;
      } catch (err) {
        setError(err as KernelError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client, cache]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}

/**
 * Hook for updating entities.
 *
 * @example
 * ```tsx
 * function EditProductForm({ entity }: { entity: Entity }) {
 *   const { mutate, loading } = useUpdateEntity();
 *
 *   const handleSave = async (newName: string) => {
 *     await mutate({
 *       id: entity.id,
 *       expected_version: entity.version,
 *       set_properties: {
 *         name: { source: 'literal', value: { type: 'text', value: newName } }
 *       }
 *     });
 *   };
 *
 *   return <form>...</form>;
 * }
 * ```
 */
export function useUpdateEntity(): UseMutationResult<Entity, UpdateEntityInput> {
  const client = useClient();
  const cache = useCache();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KernelError | null>(null);
  const [data, setData] = useState<Entity | null>(null);

  const mutate = useCallback(
    async (input: UpdateEntityInput): Promise<Entity> => {
      setLoading(true);
      setError(null);

      try {
        const entity = await client.updateEntity(input);
        cache.setEntity(entity);
        setData(entity);
        return entity;
      } catch (err) {
        setError(err as KernelError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client, cache]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}

/**
 * Hook for deleting entities.
 *
 * @example
 * ```tsx
 * function DeleteButton({ id }: { id: EntityId }) {
 *   const { mutate, loading } = useDeleteEntity();
 *
 *   return (
 *     <Button onClick={() => mutate(id)} disabled={loading}>
 *       Delete
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteEntity(): UseMutationResult<void, EntityId> {
  const client = useClient();
  const cache = useCache();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KernelError | null>(null);
  const [data, setData] = useState<void | null>(null);

  const mutate = useCallback(
    async (id: EntityId): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await client.deleteEntity(id);
        cache.invalidateEntity(id);
        setData(undefined);
      } catch (err) {
        setError(err as KernelError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client, cache]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}

/**
 * Hook for creating relationships.
 */
export function useCreateRelationship(): UseMutationResult<
  Relationship,
  CreateRelationshipInput
> {
  const client = useClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KernelError | null>(null);
  const [data, setData] = useState<Relationship | null>(null);

  const mutate = useCallback(
    async (input: CreateRelationshipInput): Promise<Relationship> => {
      setLoading(true);
      setError(null);

      try {
        const relationship = await client.createRelationship(input);
        setData(relationship);
        return relationship;
      } catch (err) {
        setError(err as KernelError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}

/**
 * Hook for deleting relationships.
 */
export function useDeleteRelationship(): UseMutationResult<void, string> {
  const client = useClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<KernelError | null>(null);
  const [data, setData] = useState<void | null>(null);

  const mutate = useCallback(
    async (id: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await client.deleteRelationship(id);
        setData(undefined);
      } catch (err) {
        setError(err as KernelError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { mutate, loading, error, data, reset };
}
