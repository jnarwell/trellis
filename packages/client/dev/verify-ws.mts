/**
 * WebSocket verification client (dev tool).
 *
 * Connects to a Trellis WS endpoint, authenticates, subscribes to an entity
 * type, then waits for one event. Exit 0 on event received, 1 on timeout.
 *
 *   npx tsx dev/verify-ws.mts ws://localhost:8080/ws <tenant_id> <actor_id> work_item
 */

import WebSocket from 'ws';

const [url = 'ws://localhost:8080/ws', tenantId = '', actorId = '', entityType = 'work_item'] =
  process.argv.slice(2);

const ws = new WebSocket(url);
const timeout = setTimeout(() => {
  console.error('TIMEOUT: no event received in 20s');
  process.exit(1);
}, 20_000);

ws.on('open', () => {
  console.log('connected, authenticating...');
  ws.send(JSON.stringify({ type: 'auth', tenant_id: tenantId, actor_id: actorId }));
});

ws.on('message', (data: Buffer) => {
  const message = JSON.parse(String(data)) as Record<string, unknown>;
  console.log('<<', message['type']);
  switch (message['type']) {
    case 'authenticated':
      ws.send(JSON.stringify({ type: 'subscribe', entity_type: entityType }));
      break;
    case 'subscribed':
      console.log('subscribed:', message['subscription_id'], '- waiting for an event...');
      break;
    case 'event': {
      const event = message['event'] as Record<string, unknown>;
      console.log('EVENT RECEIVED:', event['event_type'], event['entity_id']);
      clearTimeout(timeout);
      ws.close();
      process.exit(0);
    }
  }
});

ws.on('error', (err: Error) => {
  console.error('WS ERROR:', err.message);
  process.exit(1);
});
