/**
 * Trellis Client SDK - React State Management
 *
 * React context, hooks, and cache for Trellis.
 */

// Context and provider
export {
  TrellisProvider,
  useTrellis,
  useClient,
  useCache,
  useAuthState,
  useConnectionState,
  useIsReady,
  type TrellisContextValue,
  type TrellisProviderProps,
} from './store.js';

// Data hooks
export {
  useEntity,
  useQuery,
  useSubscription,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useCreateRelationship,
  useDeleteRelationship,
} from './hooks.js';

// Cache
export { EntityCache } from './cache.js';
