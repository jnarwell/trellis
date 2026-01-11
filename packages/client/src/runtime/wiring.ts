/**
 * Trellis Block Runtime - Wiring System
 *
 * Connects block events to receivers.
 */

import type { BlockInstanceId } from '@trellis/kernel';
import type { WiringConfig, TransformConfig } from '@trellis/server';
import type { BindingScope, FunctionContext } from '../binding/index.js';
import {
  createEventScope,
  evaluateString,
  evaluate,
  parse,
} from '../binding/index.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * An event emitted by a block.
 */
export interface BlockEvent {
  /** Block instance ID that emitted the event */
  readonly source: BlockInstanceId | '$navigate' | '$system';

  /** Event name */
  readonly event: string;

  /** Event payload */
  readonly payload: unknown;

  /** Timestamp */
  readonly timestamp: number;
}

/**
 * A receiver that handles events.
 */
export interface EventReceiver {
  /** Block instance ID that receives the event */
  readonly target: BlockInstanceId | '$navigate' | '$system';

  /** Receiver name on target */
  readonly receiver: string;

  /** Handler function */
  readonly handler: (payload: unknown) => void;
}

/**
 * Navigation actions for $navigate target.
 */
export interface NavigationActions {
  push(params: { path: string; query?: Record<string, string> }): void;
  replace(params: { path: string; query?: Record<string, string> }): void;
  back(): void;
  forward(): void;
  toView(params: { view: string; params?: Record<string, string>; query?: Record<string, string> }): void;
}

/**
 * Wiring connection.
 */
export interface WiringConnection {
  readonly config: WiringConfig;
  readonly active: boolean;
}

// =============================================================================
// WIRING MANAGER
// =============================================================================

/**
 * Manages event wiring between blocks.
 */
export class WiringManager {
  private readonly connections: WiringConnection[] = [];
  private readonly receivers = new Map<string, EventReceiver[]>();
  private readonly functionContext: FunctionContext;
  private navigationActions?: NavigationActions;

  constructor(functionContext: FunctionContext = {}) {
    this.functionContext = functionContext;
  }

  /**
   * Set navigation actions for $navigate target.
   */
  setNavigationActions(actions: NavigationActions): void {
    this.navigationActions = actions;
  }

  /**
   * Register wiring configurations.
   */
  registerWiring(configs: readonly WiringConfig[]): void {
    for (const config of configs) {
      this.connections.push({ config, active: true });
    }
  }

  /**
   * Register a receiver.
   */
  registerReceiver(
    blockId: BlockInstanceId | '$navigate' | '$system',
    receiverName: string,
    handler: (payload: unknown) => void
  ): void {
    const key = `${blockId}:${receiverName}`;
    const receivers = this.receivers.get(key) ?? [];
    receivers.push({ target: blockId, receiver: receiverName, handler });
    this.receivers.set(key, receivers);
  }

  /**
   * Unregister a receiver.
   */
  unregisterReceiver(
    blockId: BlockInstanceId | '$navigate' | '$system',
    receiverName: string
  ): void {
    const key = `${blockId}:${receiverName}`;
    this.receivers.delete(key);
  }

  /**
   * Emit an event from a block.
   */
  emit(
    sourceId: BlockInstanceId | '$navigate' | '$system',
    eventName: string,
    payload: unknown,
    scope: BindingScope
  ): void {
    const event: BlockEvent = {
      source: sourceId,
      event: eventName,
      payload,
      timestamp: Date.now(),
    };

    // Find matching wiring connections
    for (const connection of this.connections) {
      if (!connection.active) continue;

      const { config } = connection;

      // Check if source matches
      if (config.from !== sourceId) continue;

      // Check if event matches
      if (config.event !== eventName) continue;

      // Check condition
      if (config.condition) {
        const eventScope = createEventScope(scope, payload);
        try {
          const conditionResult = evaluateString(config.condition, eventScope, {
            functions: this.functionContext,
          });
          if (!conditionResult) continue;
        } catch {
          // Condition evaluation failed, skip
          continue;
        }
      }

      // Apply transform
      let transformedPayload = payload;
      if (config.transform) {
        try {
          transformedPayload = this.applyTransform(config.transform, payload, scope);
        } catch (error) {
          console.error('Transform failed:', error);
          continue;
        }
      }

      // Dispatch to target
      this.dispatch(config.to, config.receiver, transformedPayload);
    }
  }

  /**
   * Apply a transform to the payload.
   */
  private applyTransform(
    transform: TransformConfig,
    payload: unknown,
    scope: BindingScope
  ): unknown {
    switch (transform.kind) {
      case 'identity':
        return payload;

      case 'pick': {
        if (typeof payload !== 'object' || payload === null) {
          return payload;
        }
        const result: Record<string, unknown> = {};
        const obj = payload as Record<string, unknown>;
        for (const field of transform.fields) {
          if (field in obj) {
            result[field] = obj[field];
          }
        }
        return result;
      }

      case 'rename': {
        if (typeof payload !== 'object' || payload === null) {
          return payload;
        }
        const result: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
        for (const [oldName, newName] of Object.entries(transform.mapping)) {
          if (oldName in result) {
            result[newName] = result[oldName];
            delete result[oldName];
          }
        }
        return result;
      }

      case 'expression': {
        const eventScope = createEventScope(scope, payload);
        const ast = parse(transform.expr);
        return evaluate(ast, eventScope, { functions: this.functionContext });
      }

      default:
        return payload;
    }
  }

  /**
   * Dispatch payload to a receiver.
   */
  private dispatch(
    targetId: BlockInstanceId | '$navigate' | '$system',
    receiverName: string,
    payload: unknown
  ): void {
    // Handle $navigate specially
    if (targetId === '$navigate') {
      this.handleNavigationReceiver(receiverName, payload);
      return;
    }

    // Handle $system specially
    if (targetId === '$system') {
      this.handleSystemReceiver(receiverName, payload);
      return;
    }

    // Find registered receivers
    const key = `${targetId}:${receiverName}`;
    const receivers = this.receivers.get(key);

    if (!receivers || receivers.length === 0) {
      console.warn(`No receiver found for ${key}`);
      return;
    }

    // Invoke all receivers
    for (const receiver of receivers) {
      try {
        receiver.handler(payload);
      } catch (error) {
        console.error(`Receiver ${key} threw:`, error);
      }
    }
  }

  /**
   * Handle navigation receiver.
   */
  private handleNavigationReceiver(receiverName: string, payload: unknown): void {
    if (!this.navigationActions) {
      console.warn('Navigation actions not configured');
      return;
    }

    const navPayload = payload as {
      path?: string;
      query?: Record<string, string>;
      view?: string;
      params?: Record<string, string>;
    };

    switch (receiverName) {
      case 'push':
        if (navPayload.path) {
          const pushParams = navPayload.query
            ? { path: navPayload.path, query: navPayload.query }
            : { path: navPayload.path };
          this.navigationActions.push(pushParams);
        }
        break;

      case 'replace':
        if (navPayload.path) {
          const replaceParams = navPayload.query
            ? { path: navPayload.path, query: navPayload.query }
            : { path: navPayload.path };
          this.navigationActions.replace(replaceParams);
        }
        break;

      case 'back':
        this.navigationActions.back();
        break;

      case 'forward':
        this.navigationActions.forward();
        break;

      case 'toView':
        if (navPayload.view) {
          const viewParams: { view: string; params?: Record<string, string>; query?: Record<string, string> } = {
            view: navPayload.view,
          };
          if (navPayload.params) viewParams.params = navPayload.params;
          if (navPayload.query) viewParams.query = navPayload.query;
          this.navigationActions.toView(viewParams);
        }
        break;

      default:
        console.warn(`Unknown navigation receiver: ${receiverName}`);
    }
  }

  /**
   * Handle system receiver.
   */
  private handleSystemReceiver(receiverName: string, payload: unknown): void {
    switch (receiverName) {
      case 'log':
        console.log('[System]', payload);
        break;

      case 'warn':
        console.warn('[System]', payload);
        break;

      case 'error':
        console.error('[System]', payload);
        break;

      default:
        console.warn(`Unknown system receiver: ${receiverName}`);
    }
  }

  /**
   * Disable a wiring connection.
   */
  disableWiring(from: string, event: string, to: string): void {
    for (const connection of this.connections) {
      if (
        connection.config.from === from &&
        connection.config.event === event &&
        connection.config.to === to
      ) {
        (connection as { active: boolean }).active = false;
      }
    }
  }

  /**
   * Enable a wiring connection.
   */
  enableWiring(from: string, event: string, to: string): void {
    for (const connection of this.connections) {
      if (
        connection.config.from === from &&
        connection.config.event === event &&
        connection.config.to === to
      ) {
        (connection as { active: boolean }).active = true;
      }
    }
  }

  /**
   * Clear all wiring.
   */
  clear(): void {
    this.connections.length = 0;
    this.receivers.clear();
  }
}

/**
 * Create a new wiring manager.
 */
export function createWiringManager(functionContext?: FunctionContext): WiringManager {
  return new WiringManager(functionContext);
}
