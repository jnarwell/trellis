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

function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// --- In-memory file store so the FileUploader/FileViewer blocks actually work
//     in demo mode (uploads are kept as data URLs, viewable per entity). ---
interface MockFile {
  id: string;
  entityId: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}
const mockFiles: MockFile[] = [];
let mockFileSeq = 0;

function splitBuffer(buf: Buffer, delimiter: Buffer): Buffer[] {
  const out: Buffer[] = [];
  let start = 0;
  let idx = buf.indexOf(delimiter, start);
  while (idx !== -1) {
    out.push(buf.subarray(start, idx));
    start = idx + delimiter.length;
    idx = buf.indexOf(delimiter, start);
  }
  out.push(buf.subarray(start));
  return out;
}

/** Minimal multipart/form-data parser — enough for one file + simple fields. */
function parseMultipart(
  body: Buffer,
  boundary: string
): { fields: Record<string, string>; file?: { filename: string; mimeType: string; content: Buffer } } {
  const fields: Record<string, string> = {};
  let file: { filename: string; mimeType: string; content: Buffer } | undefined;

  for (const seg of splitBuffer(body, Buffer.from(`--${boundary}`))) {
    const headerEnd = seg.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerText = seg.subarray(0, headerEnd).toString('utf8');
    const nameMatch = headerText.match(/name="([^"]*)"/);
    if (!nameMatch) continue;

    let content = seg.subarray(headerEnd + 4);
    // strip the trailing CRLF that precedes the next boundary
    if (content.length >= 2 && content[content.length - 2] === 0x0d && content[content.length - 1] === 0x0a) {
      content = content.subarray(0, content.length - 2);
    }

    const fileMatch = headerText.match(/filename="([^"]*)"/);
    if (fileMatch && fileMatch[1]) {
      const ctMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
      file = { filename: fileMatch[1], mimeType: ctMatch?.[1]?.trim() ?? 'application/octet-stream', content };
    } else {
      fields[nameMatch[1]!] = content.toString('utf8');
    }
  }
  return { fields, file };
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

    // Raw YAML source for the "view config" panel — shows the file that
    // generated the current app
    const sourceMatch = url.match(/^\/api\/config\/products\/([^/?]+)\/source$/);
    if (method === 'GET' && sourceMatch) {
      const productId = sourceMatch[1]!;
      for (const ext of ['.yaml', '.yml']) {
        const yamlPath = path.join(productsDir, `${productId}${ext}`);
        if (fs.existsSync(yamlPath)) {
          sendJson(res, { id: productId, source: fs.readFileSync(yamlPath, 'utf-8') });
          return;
        }
      }
      sendJson(res, { error: 'Product not found' }, 404);
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

    // File upload — store the file as a data URL keyed by entity.
    if (method === 'POST' && url.startsWith('/api/files')) {
      const contentType = req.headers['content-type'] ?? '';
      const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
      const raw = await readRawBody(req);
      let record: MockFile;
      if (boundary) {
        const { fields, file } = parseMultipart(raw, boundary.replace(/^"|"$/g, ''));
        const mimeType = file?.mimeType ?? 'application/octet-stream';
        record = {
          id: `file-${++mockFileSeq}`,
          entityId: fields.entityId ?? 'unknown',
          filename: file?.filename ?? 'upload.bin',
          mimeType,
          size: file?.content.length ?? 0,
          url: file ? `data:${mimeType};base64,${file.content.toString('base64')}` : '',
          uploadedAt: '2026-06-24T00:00:00Z',
        };
      } else {
        record = {
          id: `file-${++mockFileSeq}`,
          entityId: 'unknown',
          filename: 'upload.bin',
          mimeType: 'application/octet-stream',
          size: raw.length,
          url: '',
          uploadedAt: '2026-06-24T00:00:00Z',
        };
      }
      mockFiles.push(record);
      sendJson(res, record);
      return;
    }

    // File delete.
    const fileDeleteMatch = /^\/api\/files\/([^/?]+)/.exec(url);
    if (method === 'DELETE' && fileDeleteMatch) {
      const idx = mockFiles.findIndex((f) => f.id === fileDeleteMatch[1]);
      if (idx !== -1) mockFiles.splice(idx, 1);
      sendJson(res, { success: true });
      return;
    }

    // File list for an entity (FileViewer).
    if (method === 'GET' && url.startsWith('/api/files')) {
      const entityId = new URLSearchParams(url.split('?')[1] ?? '').get('entityId');
      const list = entityId ? mockFiles.filter((f) => f.entityId === entityId) : mockFiles;
      sendJson(res, list);
      return;
    }

    // Catch-all so unhandled /api/* calls fail soft with an empty result
    sendJson(res, paginatedResponse([], 0));
  } catch (err) {
    console.error('[mock-api] Request failed:', err);
    sendJson(res, { error: 'Mock API error', message: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
}
