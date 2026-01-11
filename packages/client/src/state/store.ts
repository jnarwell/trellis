/**
 * Trellis Client SDK - React State Store
 *
 * React context provider for TrellisClient and cache.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { KernelEvent } from '@trellis/kernel';
import type { TrellisClient } from '../sdk/client.js';
import type { CacheConfig, AuthState, ConnectionState } from '../sdk/types.js';
import { EntityCache } from './cache.js';

/**
 * Trellis context value.
 */
export interface TrellisContextValue {
  /** TrellisClient instance */
  readonly client: TrellisClient;
  /** Entity cache */
  readonly cache: EntityCache;
  /** Current auth state */
  readonly authState: AuthState;
  /** WebSocket connection state */
  readonly connectionState: ConnectionState;
  /** Whether the client is ready */
  readonly isReady: boolean;
}

/**
 * Trellis React context.
 */
const TrellisContext = createContext<TrellisContextValue | null>(null);

/**
 * Props for TrellisProvider.
 */
export interface TrellisProviderProps {
  /** TrellisClient instance */
  readonly client: TrellisClient;
  /** Cache configuration */
  readonly cacheConfig?: CacheConfig;
  /** Auto-connect to WebSocket on mount */
  readonly autoConnect?: boolean;
  /** Children to render */
  readonly children: ReactNode;
}

/**
 * Trellis context provider.
 *
 * Provides the TrellisClient and cache to all child components.
 *
 * @example
 * ```tsx
 * const client = new TrellisClient({ baseUrl: 'http://localhost:3000' });
 *
 * function App() {
 *   return (
 *     <TrellisProvider client={client} autoConnect>
 *       <MyApp />
 *     </TrellisProvider>
 *   );
 * }
 * ```
 */
export function TrellisProvider({
  client,
  cacheConfig,
  autoConnect = false,
  children,
}: TrellisProviderProps): React.ReactElement {
  const cache = useMemo(() => new EntityCache(cacheConfig), [cacheConfig]);

  const [authState, setAuthState] = useState<AuthState>(() => client.getAuthState());
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    () => client.getConnectionState()
  );
  const [isReady, setIsReady] = useState(false);

  // Set up WebSocket event handlers
  useEffect(() => {
    client.on('onConnected', () => {
      setConnectionState('connected');
    });

    client.on('onDisconnected', () => {
      setConnectionState('disconnected');
    });

    client.on('onReconnecting', () => {
      setConnectionState('reconnecting');
    });

    client.on('onEvent', (event: KernelEvent) => {
      cache.handleEvent(event);
    });
  }, [client, cache]);

  // Auto-connect to WebSocket
  useEffect(() => {
    if (autoConnect && client.isAuthenticated()) {
      void client.connect().then(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }

    return () => {
      // Don't disconnect on unmount - let the client manage connection lifecycle
    };
  }, [client, autoConnect]);

  // Update auth state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAuthState(client.getAuthState());
    }, 1000);

    return () => clearInterval(interval);
  }, [client]);

  const value = useMemo<TrellisContextValue>(
    () => ({
      client,
      cache,
      authState,
      connectionState,
      isReady,
    }),
    [client, cache, authState, connectionState, isReady]
  );

  return React.createElement(TrellisContext.Provider, { value }, children);
}

/**
 * Hook to access Trellis context.
 *
 * @throws Error if used outside TrellisProvider
 */
export function useTrellis(): TrellisContextValue {
  const context = useContext(TrellisContext);
  if (!context) {
    throw new Error('useTrellis must be used within a TrellisProvider');
  }
  return context;
}

/**
 * Hook to access just the TrellisClient.
 *
 * @throws Error if used outside TrellisProvider
 */
export function useClient(): TrellisClient {
  return useTrellis().client;
}

/**
 * Hook to access the entity cache.
 *
 * @throws Error if used outside TrellisProvider
 */
export function useCache(): EntityCache {
  return useTrellis().cache;
}

/**
 * Hook to get auth state.
 */
export function useAuthState(): AuthState {
  return useTrellis().authState;
}

/**
 * Hook to get WebSocket connection state.
 */
export function useConnectionState(): ConnectionState {
  return useTrellis().connectionState;
}

/**
 * Hook to check if client is ready.
 */
export function useIsReady(): boolean {
  return useTrellis().isReady;
}
