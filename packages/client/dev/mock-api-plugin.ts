/**
 * Mock API plugin for local development.
 *
 * Serves the same HTTP contracts as the real Trellis server so the demo
 * runs with zero external dependencies (no Postgres, no Fastify):
 *
 *   GET    /api/config/products          → list products/*.yaml
 *   GET    /api/config/products/:id      → parsed YAML config (+ _meta), like
 *                                          packages/server/src/routes/config
 *   POST   /api/entities                 → { entity }
 *   GET    /api/entities/:id             → { entity }
 *   PUT    /api/entities/:id             → { entity }  (merges set_properties)
 *   DELETE /api/entities/:id             → { success: true }
 *   GET    /api/entities?filter={...}    → { data, total_count, pagination }
 *   POST   /api/query                    → { data, total_count, pagination }
 *
 * Entities live in an in-memory EntityStore seeded from
 * products/<id>/seed/*.json at server start. Mutations persist until the dev
 * server restarts.
 *
 * Opt out with TRELLIS_API=real to proxy /api to a running real server
 * instead (see vite.config.ts).
 */

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  EntityStore,
  MOCK_TENANT_ID,
  MOCK_ACTOR_ID,
  type MockEntity,
  type QueryCondition,
  type SortSpec,
} from './entity-store.js';
import { attachMockWebSocket } from './mock-ws.js';

// =============================================================================
// HTTP HELPERS
// =============================================================================

function sendJson(res: ServerResponse, body: unknown, status = 200): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? (JSON.parse(body) as T) : ({} as T));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function paginatedResponse(data: MockEntity[], total: number, offset = 0, limit = 50) {
  return {
    data,
    total_count: total,
    pagination: {
      offset,
      limit,
      has_more: offset + data.length < total,
    },
  };
}

// =============================================================================
// SEEDING
// =============================================================================

/** Load seed entities from products/<id>/seed/*.json for every product. */
function loadSeeds(productsDir: string, store: EntityStore): void {
  if (!fs.existsSync(productsDir)) return;

  for (const entry of fs.readdirSync(productsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const seedDir = path.join(productsDir, entry.name, 'seed');
    if (!fs.existsSync(seedDir)) continue;

    for (const file of fs.readdirSync(seedDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = fs.readFileSync(path.join(seedDir, file), 'utf-8');
        const entities = JSON.parse(content) as MockEntity[];
        store.seed(entities);
      } catch (err) {
        console.error(`[mock-api] Failed to load seed ${entry.name}/seed/${file}:`, err);
      }
    }
  }
}

// =============================================================================
// REQUEST BODY TYPES (subset of the SDK contracts)
// =============================================================================

interface CreateEntityBody {
  type?: string;
  properties?: Record<string, unknown>;
}

interface UpdateEntityBody {
  set_properties?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  expected_version?: number;
}

interface QueryBody {
  type?: string;
  filter?: {
    logic?: 'and' | 'or';
    conditions?: QueryCondition[];
  };
  sort?: SortSpec[];
  pagination?: { limit?: number; offset?: number; cursor?: string };
  include_total?: boolean;
}

// =============================================================================
// PLUGIN
// =============================================================================

export interface MockApiOptions {
  /** Directory containing product YAML files. Default: <repo>/products */
  productsDir?: string;
}

export function mockApiPlugin(options: MockApiOptions = {}): Plugin {
  const store = new EntityStore();

  return {
    name: 'trellis-mock-api',

    configureServer(server) {
      // Resolve relative to the Vite root (packages/client) — __dirname is
      // unreliable inside Vite's bundled config.
      const productsDir =
        options.productsDir ?? path.resolve(server.config.root, '../../products');
      loadSeeds(productsDir, store);
      console.log(`[mock-api] Serving products from ${productsDir} (${store.size()} seed entities)`);

      // Real-time: mock WebSocket endpoint at /ws broadcasting store mutations
      if (server.httpServer) {
        attachMockWebSocket(server.httpServer, store);
        console.log('[mock-api] WebSocket endpoint registered at /ws');
      }

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        const method = req.method ?? 'GET';

        if (!url.startsWith('/api/')) {
          next();
          return;
        }

        void handleApiRequest(url, method, req, res, productsDir, store);
      });
    },
  };
}

async function handleApiRequest(
  url: string,
  method: string,
  req: IncomingMessage,
  res: ServerResponse,
  productsDir: string,
  store: EntityStore
): Promise<void> {
  try {
    // --- Auth (mirror the dev login endpoint; tokens are opaque, never verified) ---

    if (method === 'POST' && url === '/api/auth/login') {
      await readJsonBody<Record<string, unknown>>(req); // drain body
      sendJson(res, {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        tenant_id: MOCK_TENANT_ID,
        actor_id: MOCK_ACTOR_ID,
      });
      return;
    }

    if (method === 'POST' && url === '/api/auth/refresh') {
      await readJsonBody<Record<string, unknown>>(req);
      sendJson(res, {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        tenant_id: MOCK_TENANT_ID,
        actor_id: MOCK_ACTOR_ID,
      });
      return;
    }

    // --- Config routes (mirror packages/server/src/routes/config) ---

    if (method === 'GET' && url === '/api/config/products') {
      const products = fs.existsSync(productsDir)
        ? fs
            .readdirSync(productsDir, { withFileTypes: true })
            .filter((e) => e.isFile() && /\.ya?ml$/i.test(e.name))
            .map((e) => ({ id: e.name.replace(/\.ya?ml$/i, ''), file: e.name }))
        : [];
      sendJson(res, { products });
      return;
    }

    const configMatch = url.match(/^\/api\/config\/products\/([^/?]+)$/);
    if (method === 'GET' && configMatch) {
      const productId = configMatch[1]!;
      for (const ext of ['.yaml', '.yml']) {
        const yamlPath = path.join(productsDir, `${productId}${ext}`);
        if (fs.existsSync(yamlPath)) {
          const config = yaml.load(fs.readFileSync(yamlPath, 'utf-8'));
          sendJson(res, {
            ...(config as object),
            _meta: {
              id: productId,
              file: path.basename(yamlPath),
              loadedAt: new Date().toISOString(),
            },
          });
          return;
        }
      }
      sendJson(res, { error: 'Product not found', message: `No configuration found for product: ${productId}` }, 404);
      return;
    }

    // --- Entity CRUD ---

    if (method === 'POST' && url === '/api/entities') {
      const input = await readJsonBody<CreateEntityBody>(req);
      const entity = store.create(input);
      sendJson(res, { entity });
      return;
    }

    const entityIdMatch = url.match(/^\/api\/entities\/([^/?]+)$/);

    if (method === 'GET' && entityIdMatch) {
      const entity = store.get(entityIdMatch[1]!);
      if (entity) {
        sendJson(res, { entity });
      } else {
        sendJson(res, { error: 'Entity not found' }, 404);
      }
      return;
    }

    if ((method === 'PUT' || method === 'PATCH') && entityIdMatch) {
      const input = await readJsonBody<UpdateEntityBody>(req);
      const entity = store.update(entityIdMatch[1]!, input.set_properties ?? input.properties ?? {});
      if (entity) {
        sendJson(res, { entity });
      } else {
        sendJson(res, { error: 'Entity not found' }, 404);
      }
      return;
    }

    if (method === 'DELETE' && entityIdMatch) {
      if (store.delete(entityIdMatch[1]!)) {
        sendJson(res, { success: true });
      } else {
        sendJson(res, { error: 'Entity not found' }, 404);
      }
      return;
    }

    if (method === 'GET' && url.startsWith('/api/entities')) {
      const urlObj = new URL(url, 'http://localhost');
      const type = urlObj.searchParams.get('type') ?? undefined;
      const filterParam = urlObj.searchParams.get('filter');

      let data: MockEntity[];
      if (filterParam) {
        let filters: Record<string, unknown> = {};
        try {
          filters = JSON.parse(filterParam) as Record<string, unknown>;
        } catch {
          // Invalid filter JSON: ignore and return unfiltered
        }
        data = store.filter(type, filters);
      } else {
        data = store.list(type);
      }
      sendJson(res, paginatedResponse(data, data.length));
      return;
    }

    // --- Query engine ---

    if (method === 'POST' && url.startsWith('/api/query')) {
      const request = await readJsonBody<QueryBody>(req);
      const offset = request.pagination?.offset ?? 0;
      const limit = request.pagination?.limit ?? 50;
      const queryOptions: Parameters<EntityStore['query']>[0] = { offset, limit };
      if (request.type !== undefined) queryOptions.type = request.type;
      if (request.filter?.conditions !== undefined) queryOptions.conditions = request.filter.conditions;
      if (request.sort !== undefined) queryOptions.sort = request.sort;
      const { data, total } = store.query(queryOptions);
      sendJson(res, paginatedResponse(data, total, offset, limit));
      return;
    }

    if (method === 'GET' && url.startsWith('/api/query')) {
      const { data, total } = store.query({});
      sendJson(res, paginatedResponse(data, total));
      return;
    }

    // --- Auxiliary endpoints used by individual blocks ---

    if (url.startsWith('/api/comments')) {
      sendJson(res, { data: [] });
      return;
    }

    if (url.startsWith('/api/files')) {
      sendJson(res, []);
      return;
    }

    // Catch-all so unhandled /api/* calls fail soft with an empty result
    sendJson(res, paginatedResponse([], 0));
  } catch (err) {
    console.error('[mock-api] Request failed:', err);
    sendJson(res, { error: 'Mock API error', message: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
}
