/**
 * Trellis BlockProvider
 *
 * Provides block context including wiring and data binding scope.
 */

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { BlockInstanceId } from '@trellis/kernel';
import type { WiringManager } from '../runtime/wiring.js';
import type { BindingScope } from '../binding/index.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Block context value available to all blocks.
 */
export interface BlockContextValue {
  /** Unique instance ID for this block */
  readonly instanceId: BlockInstanceId;

  /** Wiring manager for event routing */
  readonly wiring: WiringManager;

  /** Current data binding scope */
  readonly scope: BindingScope;

  /**
   * Emit an event from this block.
   *
   * @param event - Event name
   * @param payload - Event payload
   */
  emit: (event: string, payload: unknown) => void;
}

/**
 * Props for BlockProvider.
 */
export interface BlockProviderProps {
  /** Block instance ID */
  instanceId: BlockInstanceId;

  /** Wiring manager */
  wiring: WiringManager;

  /** Data binding scope */
  scope: BindingScope;

  /** Child components */
  children: React.ReactNode;
}

// =============================================================================
// CONTEXT
// =============================================================================

const BlockContext = createContext<BlockContextValue | null>(null);

/**
 * Hook to access the current block context.
 *
 * @throws Error if used outside of a BlockProvider
 *
 * @example
 * ```tsx
 * function MyBlockComponent() {
 *   const { emit, scope } = useBlockContext();
 *
 *   const handleClick = () => {
 *     emit('rowClicked', { id: '123' });
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useBlockContext(): BlockContextValue {
  const ctx = useContext(BlockContext);
  if (!ctx) {
    throw new Error(
      'useBlockContext must be used within a BlockProvider. ' +
        'Make sure your component is wrapped in a BlockProvider.'
    );
  }
  return ctx;
}

/**
 * Hook to access block context if available (returns null if outside provider).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const blockCtx = useOptionalBlockContext();
 *
 *   if (blockCtx) {
 *     // Inside a block provider
 *     blockCtx.emit('event', {});
 *   }
 * }
 * ```
 */
export function useOptionalBlockContext(): BlockContextValue | null {
  return useContext(BlockContext);
}

/**
 * Hook to get the emit function for the current block.
 *
 * @throws Error if used outside of a BlockProvider
 */
export function useBlockEmit(): (event: string, payload: unknown) => void {
  const { emit } = useBlockContext();
  return emit;
}

/**
 * Hook to get the current data binding scope.
 *
 * @throws Error if used outside of a BlockProvider
 */
export function useBlockScope(): BindingScope {
  const { scope } = useBlockContext();
  return scope;
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Provides block context to child components.
 *
 * BlockProvider sets up the wiring and data binding context for a block instance.
 * All blocks should be wrapped in a BlockProvider.
 *
 * @example
 * ```tsx
 * <BlockProvider
 *   instanceId="block-1"
 *   wiring={wiringManager}
 *   scope={{ $entity: currentEntity }}
 * >
 *   <TableBlock config={config} />
 * </BlockProvider>
 * ```
 */
export function BlockProvider({
  instanceId,
  wiring,
  scope,
  children,
}: BlockProviderProps): React.ReactElement {
  /**
   * Emit an event through the wiring system.
   */
  const emit = useCallback(
    (event: string, payload: unknown) => {
      wiring.emit(instanceId, event, payload, scope);
    },
    [instanceId, wiring, scope]
  );

  /**
   * Memoize context value to prevent unnecessary re-renders.
   */
  const value = useMemo<BlockContextValue>(
    () => ({
      instanceId,
      wiring,
      scope,
      emit,
    }),
    [instanceId, wiring, scope, emit]
  );

  return (
    <BlockContext.Provider value={value}>{children}</BlockContext.Provider>
  );
}
