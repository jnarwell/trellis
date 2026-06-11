/**
 * Mock WebSocket server for local development.
 *
 * Speaks the real server's subscription protocol
 * (packages/server/src/websocket/protocol.ts):
 *
 *   client → auth        → server → authenticated
 *   client → subscribe   → server → subscribed { subscription_id }
 *   client → unsubscribe → server → unsubscribed { subscription_id }
 *   client → ping        → server → pong
 *   (mutations)          → server → event { subscription_id, event }
 *
 * Auth is accepted unconditionally (dev only). Events come from the
 * EntityStore mutation hook, so any change made through the mock API —
 * including from another tab or curl — pushes live updates to every
 * subscribed client.
 */

import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { EntityStore, MockKernelEvent } from './entity-store.js';

interface SubscriptionFilter {
  entity_type?: string;
  entity_id?: string;
  event_types?: readonly string[];
}

interface ClientMessage {
  type: 'auth' | 'subscribe' | 'unsubscribe' | 'ping';
  tenant_id?: string;
  actor_id?: string;
  entity_type?: string;
  entity_id?: string;
  event_types?: readonly string[];
  subscription_id?: string;
}

function matches(filter: SubscriptionFilter, event: MockKernelEvent): boolean {
  if (filter.entity_type && event.payload.type !== filter.entity_type) {
    return false;
  }
  if (filter.entity_id && event.entity_id !== filter.entity_id) {
    return false;
  }
  if (
    filter.event_types &&
    filter.event_types.length > 0 &&
    !filter.event_types.includes(event.event_type)
  ) {
    return false;
  }
  return true;
}

/**
 * Attach the mock WebSocket endpoint at /ws on the Vite dev server.
 *
 * Only upgrades requests for /ws — Vite's own HMR WebSocket (different
 * path/protocol) is untouched.
 */
export function attachMockWebSocket(
  httpServer: HttpServer,
  store: EntityStore
): void {
  const wss = new WebSocketServer({ noServer: true });
  let subscriptionCounter = 0;

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url ?? '';
    if (!url.startsWith('/ws')) {
      return; // not ours (e.g. Vite HMR)
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    const subscriptions = new Map<string, SubscriptionFilter>();

    const unsubscribeMutations = store.onMutation((event) => {
      if (ws.readyState !== ws.OPEN) return;
      for (const [id, filter] of subscriptions) {
        if (matches(filter, event)) {
          ws.send(JSON.stringify({ type: 'event', subscription_id: id, event }));
        }
      }
    });

    ws.on('message', (data) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(String(data)) as ClientMessage;
      } catch {
        return;
      }

      switch (message.type) {
        case 'auth':
          // Dev mode: accept any identity
          ws.send(JSON.stringify({ type: 'authenticated' }));
          break;

        case 'subscribe': {
          const id = `sub_${++subscriptionCounter}`;
          const filter: SubscriptionFilter = {};
          if (message.entity_type !== undefined) filter.entity_type = message.entity_type;
          if (message.entity_id !== undefined) filter.entity_id = message.entity_id;
          if (message.event_types !== undefined) filter.event_types = message.event_types;
          subscriptions.set(id, filter);
          ws.send(JSON.stringify({ type: 'subscribed', subscription_id: id }));
          break;
        }

        case 'unsubscribe':
          if (message.subscription_id) {
            subscriptions.delete(message.subscription_id);
            ws.send(
              JSON.stringify({
                type: 'unsubscribed',
                subscription_id: message.subscription_id,
              })
            );
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    });

    ws.on('close', () => {
      subscriptions.clear();
      unsubscribeMutations();
    });
  });
}
