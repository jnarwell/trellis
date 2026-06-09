/**
 * In-memory entity store for the mock dev API.
 *
 * Holds entities in the same wire format the real server returns
 * (see packages/server/src/evaluation/computation-service.ts — the DB
 * column type_path is exposed as `type` on the API):
 *   { id, tenant_id, type, version, properties: { name: { source, value: { type, value } } }, ... }
 * and implements the subset of query semantics the client SDK uses
 * (eq/neq/in conditions, sort, offset/limit pagination).
 *
 * Dev-only: no optimistic-locking conflicts are simulated (expected_version
 * is accepted and ignored).
 */

export const MOCK_TENANT_ID = '00000000-0000-7000-8000-000000000001';
export const MOCK_ACTOR_ID = '00000000-0000-7000-8000-0000000000aa';

export interface MockEntity {
  id: string;
  tenant_id: string;
  type: string;
  version: number;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface QueryCondition {
  path?: string;
  property?: string;
  operator?: string;
  value?: unknown;
}

export interface SortSpec {
  path?: string;
  property?: string;
  direction?: 'asc' | 'desc';
}

let nextId = 1000;

function generateId(): string {
  const suffix = String(nextId++).padStart(12, '0');
  return `01234567-89ab-7def-8000-${suffix}`;
}

/** Unwrap a nested property value ({ value: { value: x } } → x). */
function propertyValue(entity: MockEntity, path: string): unknown {
  if (path === 'created_at') return entity.created_at;
  if (path === 'updated_at') return entity.updated_at;
  if (path === 'id') return entity.id;
  const prop = entity.properties[path] as { value?: { value?: unknown } } | undefined;
  return prop?.value?.value;
}

export class EntityStore {
  private readonly entities = new Map<string, MockEntity>();

  seed(entities: readonly MockEntity[]): void {
    for (const entity of entities) {
      this.entities.set(entity.id, entity);
    }
  }

  size(): number {
    return this.entities.size;
  }

  list(typePath?: string): MockEntity[] {
    const all = [...this.entities.values()];
    if (!typePath) return all;
    return all.filter((e) => e.type === typePath);
  }

  get(id: string): MockEntity | undefined {
    return this.entities.get(id);
  }

  create(input: { type?: string; properties?: Record<string, unknown> }): MockEntity {
    const now = new Date().toISOString();
    const entity: MockEntity = {
      id: generateId(),
      tenant_id: MOCK_TENANT_ID,
      type: input.type ?? 'work_item',
      version: 1,
      properties: input.properties ?? {},
      created_at: now,
      updated_at: now,
      created_by: MOCK_ACTOR_ID,
    };
    this.entities.set(entity.id, entity);
    return entity;
  }

  update(id: string, properties: Record<string, unknown>): MockEntity | undefined {
    const existing = this.entities.get(id);
    if (!existing) return undefined;
    const updated: MockEntity = {
      ...existing,
      properties: { ...existing.properties, ...properties },
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };
    this.entities.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.entities.delete(id);
  }

  /** Execute an SDK-style query: conditions + sort + offset/limit. */
  query(options: {
    type?: string;
    conditions?: readonly QueryCondition[];
    sort?: readonly SortSpec[];
    offset?: number;
    limit?: number;
  }): { data: MockEntity[]; total: number } {
    let results = this.list(options.type);

    if (options.conditions?.length) {
      results = results.filter((entity) =>
        options.conditions!.every((condition) => {
          const path = condition.path ?? condition.property;
          if (!path) return true;
          const actual = propertyValue(entity, path);
          switch (condition.operator) {
            case 'neq':
              return actual !== condition.value;
            case 'in':
              return Array.isArray(condition.value) && condition.value.includes(actual);
            case 'eq':
            default:
              return actual === condition.value;
          }
        })
      );
    }

    if (options.sort?.length) {
      const specs = options.sort;
      results = [...results].sort((a, b) => {
        for (const spec of specs) {
          const path = spec.path ?? spec.property;
          if (!path) continue;
          const av = propertyValue(a, path);
          const bv = propertyValue(b, path);
          if (av === bv) continue;
          const cmp = String(av) < String(bv) ? -1 : 1;
          return spec.direction === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    const total = results.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    const data = limit === 0 ? [] : results.slice(offset, offset + limit);

    return { data, total };
  }

  /** Apply simple equality filters ({ status: 'done' }). */
  filter(typePath: string | undefined, filters: Record<string, unknown>): MockEntity[] {
    return this.list(typePath).filter((entity) =>
      Object.entries(filters).every(
        ([path, expected]) => propertyValue(entity, path) === expected
      )
    );
  }
}
