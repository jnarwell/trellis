/**
 * Trellis Client SDK - WebSocket Client
 *
 * Real-time event subscription with auto-reconnect.
 */

import type { KernelEvent, EventType, EntityId } from '@trellis/kernel';
import type {
  ConnectionState,
  SubscriptionFilter,
  Subscription,
  WebSocketEvents,
} from './types.js';
import { TrellisError } from './types.js';

// =============================================================================
// MESSAGE TYPES (matching server protocol)
// =============================================================================

interface AuthMessage {
  readonly type: 'auth';
  readonly tenant_id: string;
  readonly actor_id: string;
}

interface SubscribeMessage {
  readonly type: 'subscribe';
  readonly entity_type?: string | undefined;
  readonly entity_id?: string | undefined;
  readonly event_types?: readonly EventType[] | undefined;
}

interface UnsubscribeMessage {
  readonly type: 'unsubscribe';
  readonly subscription_id: string;
}

interface PingMessage {
  readonly type: 'ping';
}

type ClientMessage = AuthMessage | SubscribeMessage | UnsubscribeMessage | PingMessage;

interface AuthenticatedMessage {
  readonly type: 'authenticated';
}

interface SubscribedMessage {
  readonly type: 'subscribed';
  readonly subscription_id: string;
}

interface UnsubscribedMessage {
  readonly type: 'unsubscribed';
  readonly subscription_id: string;
}

interface EventMessage {
  readonly type: 'event';
  readonly subscription_id: string;
  readonly event: KernelEvent;
}

interface ErrorMessage {
  readonly type: 'error';
  readonly code: string;
  readonly message: string;
}

interface PongMessage {
  readonly type: 'pong';
}

type ServerMessage =
  | AuthenticatedMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | EventMessage
  | ErrorMessage
  | PongMessage;

// =============================================================================
// WEBSOCKET CLIENT
// =============================================================================

/**
 * WebSocket client configuration.
 */
export interface WebSocketConfig {
  readonly url: string;
  readonly autoReconnect: boolean;
  readonly maxReconnectAttempts: number;
  readonly getAuthCredentials: () => { tenantId: string; actorId: string } | null;
  readonly events?: WebSocketEvents;
}

/**
 * Pending subscription waiting for server confirmation.
 */
interface PendingSubscription {
  readonly filter: SubscriptionFilter;
  readonly callback: (event: KernelEvent) => void;
  readonly resolve: (subscription: Subscription) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Active subscription.
 */
interface ActiveSubscription {
  readonly filter: SubscriptionFilter;
  readonly callback: (event: KernelEvent) => void;
}

/**
 * WebSocket client for real-time events.
 */
export class WebSocketClient {
  private readonly config: WebSocketConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private readonly subscriptions = new Map<string, ActiveSubscription>();
  private readonly pendingSubscriptions = new Map<string, PendingSubscription>();
  private pendingSubscriptionId = 0;

  private connectPromise: Promise<void> | null = null;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((error: Error) => void) | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * Get current connection state.
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Connect to WebSocket server.
   */
  async connect(): Promise<void> {
    if (this.state === 'connected') {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
      this.doConnect();
    });

    return this.connectPromise;
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    this.cleanup();
    this.state = 'disconnected';
    this.config.events?.onDisconnected?.('manual');
  }

  /**
   * Subscribe to events matching a filter.
   */
  async subscribe(
    filter: SubscriptionFilter,
    callback: (event: KernelEvent) => void
  ): Promise<Subscription> {
    if (this.state !== 'connected') {
      throw new TrellisError('Not connected', 'NOT_CONNECTED');
    }

    return new Promise((resolve, reject) => {
      const tempId = `pending_${++this.pendingSubscriptionId}`;

      this.pendingSubscriptions.set(tempId, {
        filter,
        callback,
        resolve,
        reject,
      });

      const message: SubscribeMessage = {
        type: 'subscribe',
        entity_type: filter.entityType,
        entity_id: filter.entityId,
        event_types: filter.eventTypes,
      };

      this.send(message);
    });
  }

  /**
   * Unsubscribe from a subscription.
   */
  unsubscribe(subscriptionId: string): void {
    if (!this.subscriptions.has(subscriptionId)) {
      return;
    }

    this.subscriptions.delete(subscriptionId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: UnsubscribeMessage = {
        type: 'unsubscribe',
        subscription_id: subscriptionId,
      };
      this.send(message);
    }
  }

  private doConnect(): void {
    this.state = 'connecting';
    this.clearReconnectTimer();

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        this.state = 'authenticating';
        this.authenticate();
      };

      this.ws.onclose = (event) => {
        this.handleClose(event.reason);
      };

      this.ws.onerror = (event) => {
        this.handleError(new Error('WebSocket error'));
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error('Connection failed')
      );
    }
  }

  private authenticate(): void {
    const credentials = this.config.getAuthCredentials();

    if (!credentials) {
      this.handleError(new TrellisError('Not authenticated', 'AUTH_REQUIRED'));
      return;
    }

    const message: AuthMessage = {
      type: 'auth',
      tenant_id: credentials.tenantId,
      actor_id: credentials.actorId,
    };

    this.send(message);
  }

  private handleMessage(data: string): void {
    let message: ServerMessage;

    try {
      message = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case 'authenticated':
        this.handleAuthenticated();
        break;

      case 'subscribed':
        this.handleSubscribed(message);
        break;

      case 'unsubscribed':
        this.handleUnsubscribed(message);
        break;

      case 'event':
        this.handleEvent(message);
        break;

      case 'error':
        this.handleServerError(message);
        break;

      case 'pong':
        // Pong received, connection is alive
        break;
    }
  }

  private handleAuthenticated(): void {
    this.state = 'connected';
    this.reconnectAttempts = 0;
    this.startPingTimer();

    // Resolve connect promise
    if (this.connectResolve) {
      this.connectResolve();
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
    }

    // Resubscribe existing subscriptions after reconnect
    this.resubscribeAll();

    this.config.events?.onConnected?.();
  }

  private handleSubscribed(message: SubscribedMessage): void {
    // Find pending subscription and activate it
    const pending = this.findAndRemovePendingSubscription();

    if (pending) {
      const { filter, callback, resolve } = pending;

      this.subscriptions.set(message.subscription_id, { filter, callback });

      const subscription: Subscription = {
        id: message.subscription_id,
        unsubscribe: () => this.unsubscribe(message.subscription_id),
      };

      resolve(subscription);
    }
  }

  private handleUnsubscribed(message: UnsubscribedMessage): void {
    this.subscriptions.delete(message.subscription_id);
  }

  private handleEvent(message: EventMessage): void {
    const subscription = this.subscriptions.get(message.subscription_id);

    if (subscription) {
      subscription.callback(message.event);
      this.config.events?.onEvent?.(message.event, message.subscription_id);
    }
  }

  private handleServerError(message: ErrorMessage): void {
    const error = new TrellisError(message.message, message.code);

    // Check if it's an auth error
    if (message.code === 'AUTH_REQUIRED' || message.code === 'AUTH_FAILED') {
      if (this.connectReject) {
        this.connectReject(error);
        this.connectResolve = null;
        this.connectReject = null;
        this.connectPromise = null;
      }
      return;
    }

    // Reject pending subscriptions
    const pending = this.findAndRemovePendingSubscription();
    if (pending) {
      pending.reject(error);
    }
  }

  private handleClose(reason?: string): void {
    this.stopPingTimer();
    this.ws = null;

    const wasConnected = this.state === 'connected';
    this.state = 'disconnected';

    // Reject pending connect promise
    if (this.connectReject) {
      this.connectReject(new TrellisError('Connection closed', 'CONNECTION_CLOSED'));
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
    }

    // Reject pending subscriptions
    for (const [id, pending] of this.pendingSubscriptions) {
      pending.reject(new TrellisError('Connection closed', 'CONNECTION_CLOSED'));
    }
    this.pendingSubscriptions.clear();

    if (wasConnected) {
      this.config.events?.onDisconnected?.(reason);
    }

    // Auto-reconnect if enabled
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.config.events?.onError?.(error);

    if (this.connectReject) {
      this.connectReject(error);
      this.connectResolve = null;
      this.connectReject = null;
      this.connectPromise = null;
    }
  }

  private scheduleReconnect(): void {
    this.state = 'reconnecting';
    this.reconnectAttempts++;

    const delay = this.calculateBackoff();
    this.config.events?.onReconnecting?.(this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connectPromise = new Promise<void>((resolve, reject) => {
        this.connectResolve = resolve;
        this.connectReject = reject;
        this.doConnect();
      });
    }, delay);
  }

  private calculateBackoff(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const base = 1000;
    const max = 30000;
    const delay = Math.min(base * Math.pow(2, this.reconnectAttempts - 1), max);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  private resubscribeAll(): void {
    // Copy current subscriptions
    const subscriptionsToRestore = new Map(this.subscriptions);
    this.subscriptions.clear();

    // Resubscribe each
    for (const [, { filter, callback }] of subscriptionsToRestore) {
      void this.subscribe(filter, callback);
    }
  }

  private findAndRemovePendingSubscription(): PendingSubscription | null {
    // Return first pending subscription (FIFO order)
    const first = this.pendingSubscriptions.entries().next().value;
    if (first) {
      const [id, pending] = first as [string, PendingSubscription];
      this.pendingSubscriptions.delete(id);
      return pending;
    }
    return null;
  }

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private startPingTimer(): void {
    this.stopPingTimer();
    // Send ping every 30 seconds
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cleanup(): void {
    this.stopPingTimer();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.pendingSubscriptions.clear();
  }
}
