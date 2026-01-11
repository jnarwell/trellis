/**
 * Trellis Server - WebSocket Plugin
 *
 * Fastify plugin that sets up WebSocket support.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import fastifyWebsocket from '@fastify/websocket';
import type { IEventEmitter } from '../events/types.js';
import {
  createSubscriptionManager,
  type SubscriptionManager,
} from '../websocket/subscriptions.js';
import { handleConnection } from '../websocket/connection.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for the WebSocket plugin.
 */
export interface WebSocketPluginOptions extends FastifyPluginOptions {
  /** Event emitter for subscribing to events */
  readonly eventEmitter?: IEventEmitter;

  /** Path for WebSocket endpoint (default: /ws) */
  readonly path?: string;
}

// =============================================================================
// PLUGIN
// =============================================================================

/**
 * WebSocket plugin for Trellis.
 *
 * Sets up WebSocket endpoint at /ws (configurable) and integrates
 * with the event emitter for real-time updates.
 */
async function websocketPluginImpl(
  app: FastifyInstance,
  options: WebSocketPluginOptions
): Promise<void> {
  const { eventEmitter, path = '/ws' } = options;

  // Register @fastify/websocket
  await app.register(fastifyWebsocket, {
    options: {
      // Close connections that don't respond to ping
      clientTracking: true,
    },
  });

  // Create subscription manager
  const subscriptionManager = createSubscriptionManager();

  // Register broadcast handler if event emitter provided
  if (eventEmitter) {
    eventEmitter.onAll(async (event) => {
      subscriptionManager.broadcast(event);
    });

    app.log.info('WebSocket event broadcast enabled');
  }

  // Decorate app with subscription manager for access in routes/tests
  app.decorate('subscriptionManager', subscriptionManager);

  // Register WebSocket route
  app.get(path, { websocket: true }, (socket, request) => {
    handleConnection(socket, request.raw, {
      subscriptionManager,
      logger: request.log,
    });
  });

  app.log.info(`WebSocket endpoint registered at ${path}`);
}

/**
 * WebSocket plugin wrapped with fastify-plugin.
 */
export const websocketPlugin = fp(websocketPluginImpl, {
  name: 'trellis-websocket',
  fastify: '5.x',
});

// =============================================================================
// TYPE AUGMENTATION
// =============================================================================

declare module 'fastify' {
  interface FastifyInstance {
    /** Subscription manager for WebSocket connections */
    subscriptionManager: SubscriptionManager;
  }
}
