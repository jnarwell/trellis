/**
 * Seed-loading tests for the product loader.
 *
 * Round C fix: the loader used to register entity-type schemas but seed ZERO
 * data (`loadSeedData` was a stub returning 0), so `trellis serve` produced an
 * empty app. These tests prove it now reads the shipped `seed/*.json` files and
 * inserts entities + relationships, with the loaded tenant owning every row.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createBlockRegistry, asBlockType } from '@trellis/kernel';
import type { BlockSpec } from '@trellis/kernel';
import { loadEntitySeedFiles } from '../../src/loader/seed-data.js';
import { ProductLoader } from '../../src/loader/product-loader.js';

/** A registry with just the one block our minimal test view references. */
function makeTestRegistry() {
  const registry = createBlockRegistry();
  const spec: BlockSpec = {
    type: asBlockType('trellis.page-header'),
    version: '1.0.0',
    name: 'Page Header',
    category: 'layout',
    description: 'Page title',
    props: {},
    emits: {},
    receives: {},
    slots: {},
  };
  registry.registerBlock(spec);
  return registry;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
// tests/loader → repo root → products/
const productsDir = resolve(__dirname, '../../../../products');

describe('loadEntitySeedFiles', () => {
  it('reads the shipped PLM seed (array-of-entities format)', async () => {
    const bundle = await loadEntitySeedFiles(join(productsDir, 'plm', 'seed'));
    expect(bundle.entities).toHaveLength(8);
    expect(bundle.entities.every((e) => e.type === 'part')).toBe(true);
    expect(bundle.entities[0]?.properties).toHaveProperty('name');
    expect(bundle.relationships).toHaveLength(0);
  });

  it('reads the shipped kitchen-sink seed (multiple files)', async () => {
    const bundle = await loadEntitySeedFiles(join(productsDir, 'kitchen-sink', 'seed'));
    const types = new Set(bundle.entities.map((e) => e.type));
    expect(types.has('work_item')).toBe(true);
    expect(types.has('audit_event')).toBe(true);
  });

  it('returns an empty bundle for a missing seed directory', async () => {
    const bundle = await loadEntitySeedFiles(join(productsDir, 'does-not-exist', 'seed'));
    expect(bundle).toEqual({ entities: [], relationships: [] });
  });

  it('parses the object form with entities + relationships', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'trellis-seed-'));
    try {
      await writeFile(
        join(dir, 'bundle.json'),
        JSON.stringify({
          entities: [
            { id: 'a', type: 'node', properties: { n: { source: 'literal', value: { type: 'text', value: 'A' } } } },
            { id: 'b', type: 'node', properties: { n: { source: 'literal', value: { type: 'text', value: 'B' } } } },
          ],
          relationships: [{ type: 'links', from_entity: 'a', to_entity: 'b' }],
        })
      );
      const bundle = await loadEntitySeedFiles(dir);
      expect(bundle.entities).toHaveLength(2);
      expect(bundle.relationships).toEqual([{ type: 'links', from_entity: 'a', to_entity: 'b' }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('ignores malformed records and non-JSON files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'trellis-seed-'));
    try {
      await writeFile(join(dir, 'notes.txt'), 'not json');
      await writeFile(
        join(dir, 'data.json'),
        JSON.stringify([
          { type: 'ok', properties: {} },
          { type: 'missing-props' }, // no properties → skipped
          { properties: {} }, // no type → skipped
        ])
      );
      const bundle = await loadEntitySeedFiles(dir);
      expect(bundle.entities).toHaveLength(1);
      expect(bundle.entities[0]?.type).toBe('ok');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Full load() wiring against a fake DB — proves seeds reach the database.
// ---------------------------------------------------------------------------

interface CapturedEntity {
  id: string;
  tenant_id: string;
  type_path: string;
  version: number;
  created_by: string;
}

/** Minimal in-memory DB implementing the loader's ProductLoaderDb contract. */
function makeFakeDb() {
  const entities: CapturedEntity[] = [];
  const relationships: Array<Record<string, unknown>> = [];
  const typeSchemas: Array<Record<string, unknown>> = [];
  let idSeq = 0;

  const table = (sink: Array<Record<string, unknown>>) => ({
    findFirst: async () => null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      sink.push(data);
      const id = (data.id as string) ?? `gen-${++idSeq}`;
      return { id };
    },
    update: async ({ where }: { where: { id: string } }) => ({ id: where.id }),
  });

  const tenants = { _id: 'tenant-1' };
  const actors = { _id: 'actor-1' };

  const db = {
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      return fn({
        type_schemas: table(typeSchemas),
        entities: table(entities as unknown as Array<Record<string, unknown>>),
        relationships: table(relationships),
      });
    },
    tenants: {
      findFirst: async () => null,
      create: async () => ({ id: tenants._id }),
      update: async () => ({ id: tenants._id }),
    },
    actors: {
      findFirst: async () => null,
      create: async () => ({ id: actors._id }),
      update: async () => ({ id: actors._id }),
    },
  };

  return { db, entities, relationships, typeSchemas };
}

describe('ProductLoader.load() seeds the database', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'trellis-product-'));
    // Minimal directory product: id/name/version + one entity, NO views (so no
    // block-registry validation), plus a seed/ folder.
    await writeFile(
      join(dir, 'product.yaml'),
      [
        'id: temp-widgets',
        'name: Temp Widgets',
        'version: 1.0.0',
        'defaultView: main',
        'includes:',
        '  entities: entities/*.yaml',
        '  views: views/*.yaml',
      ].join('\n')
    );
    await mkdir(join(dir, 'entities'), { recursive: true });
    await writeFile(
      join(dir, 'entities', 'widget.yaml'),
      ['id: widget', 'name: Widget', 'properties:', '  - name: title', '    type: text'].join('\n')
    );
    await mkdir(join(dir, 'views'), { recursive: true });
    await writeFile(
      join(dir, 'views', 'main.yaml'),
      [
        'id: main',
        'name: Main',
        'route: /',
        'layout:',
        '  type: stack',
        '  direction: vertical',
        '  blocks:',
        '    - type: trellis.page-header',
        '      id: header',
        '      props:',
        '        title: Widgets',
      ].join('\n')
    );
    await mkdir(join(dir, 'seed'), { recursive: true });
    await writeFile(
      join(dir, 'seed', 'widgets.json'),
      JSON.stringify([
        { id: 'widget-1', type: 'widget', properties: { title: { source: 'literal', value: { type: 'text', value: 'One' } } } },
        { id: 'widget-2', type: 'widget', properties: { title: { source: 'literal', value: { type: 'text', value: 'Two' } } } },
      ])
    );
    // Object-form file contributes a relationship instance.
    await writeFile(
      join(dir, 'seed', 'links.json'),
      JSON.stringify({ relationships: [{ type: 'depends_on', from_entity: 'widget-2', to_entity: 'widget-1' }] })
    );
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('inserts seeded entities + relationships owned by the loaded tenant', async () => {
    const { db, entities, relationships } = makeFakeDb();
    const loader = new ProductLoader(db as never, makeTestRegistry());

    const result = await loader.load(join(dir, 'product.yaml'), { force: true });

    expect(result.success).toBe(true);
    expect(result.entitiesSeeded).toBe(2);
    expect(result.relationshipsSeeded).toBe(1);
    expect(entities).toHaveLength(2);
    // The loaded tenant owns every row, regardless of any baked-in tenant_id.
    expect(entities.every((e) => e.tenant_id === 'tenant-1')).toBe(true);
    expect(entities.every((e) => e.type_path === 'widget')).toBe(true);
    expect(entities.find((e) => e.id === 'widget-2')).toBeDefined();
    expect(entities.every((e) => typeof e.id === 'string' && e.id.length > 0)).toBe(true);
    // Relationship instance reached the relationships table under the tenant.
    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      type: 'depends_on',
      from_entity: 'widget-2',
      to_entity: 'widget-1',
      tenant_id: 'tenant-1',
    });
  });
});
