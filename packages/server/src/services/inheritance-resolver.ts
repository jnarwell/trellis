/**
 * Trellis - Read-time Property Inheritance Resolver
 *
 * An `inherited` property carries a `from_entity` / `from_property` pointer but
 * no value of its own; its `resolved_value` is populated at read time by
 * following that pointer to the source entity's effective value. Previously the
 * `resolveInherited` read option was a no-op, so inherited properties always
 * resolved to null (unless explicitly overridden). This module implements the
 * resolution: it reads the source property's effective value, handles inherited
 * chains (the source may itself inherit), and flags missing sources / cycles.
 */

import type { Entity, EntityId, Property, PropertyName, Value, NumberValue } from '@trellis/kernel';

/** Loads another entity in the same tenant, or null if it does not exist. */
export type EntityLoader = (id: EntityId) => Promise<Entity | null>;

export interface InheritanceResolveResult {
  readonly entity: Entity;
  /** True if any inherited property's resolved_value changed. */
  readonly changed: boolean;
}

/**
 * A property's effective value WITHOUT crossing into another entity:
 *  - literal  → its value
 *  - measured → its value, with the sibling uncertainty merged onto the number
 *  - computed → the cached value (null if pending/error)
 *  - inherited→ override ?? already-resolved value (null until resolved)
 */
export function effectiveValue(property: Property): Value | null {
  switch (property.source) {
    case 'literal':
      return property.value ?? null;
    case 'measured': {
      if (!property.value) return null;
      if (property.uncertainty !== undefined && property.value.uncertainty === undefined) {
        return { ...(property.value as NumberValue), uncertainty: property.uncertainty };
      }
      return property.value;
    }
    case 'computed':
      // Only a valid cache is a real value; stale/pending/error must not be
      // silently inherited as if authoritative.
      return property.computation_status === 'valid' ? property.cached_value ?? null : null;
    case 'inherited':
      return property.override ?? property.resolved_value ?? null;
    default:
      return null;
  }
}

/**
 * Resolve every inherited property on `entity` by following its source pointer.
 * Returns a new entity with `resolved_value` / `computation_status` populated.
 * Pure aside from `loadEntity`; `visited` guards against inheritance cycles.
 */
export async function resolveInheritance(
  entity: Entity,
  loadEntity: EntityLoader
): Promise<InheritanceResolveResult> {
  let changed = false;
  const nextProperties: Record<string, Property> = { ...entity.properties };

  for (const [name, property] of Object.entries(entity.properties)) {
    if (property.source !== 'inherited') continue;
    // An explicit override wins and needs no source lookup.
    if (property.override !== undefined) continue;

    // A fresh path per property records only the chain we are actively
    // descending, so two siblings inheriting from the same source (a diamond)
    // do NOT see each other's keys and trigger a false cycle.
    const path = new Set<string>([`${entity.id}:${name}`]);
    const resolved = await resolveOne(property, loadEntity, path);

    if (
      resolved.computation_status !== property.computation_status ||
      resolved.resolved_value !== property.resolved_value ||
      resolved.computation_error !== property.computation_error
    ) {
      changed = true;
    }
    nextProperties[name] = resolved;
  }

  if (!changed) return { entity, changed: false };
  return {
    entity: { ...entity, properties: nextProperties as Entity['properties'] },
    changed: true,
  };
}

type ChainResult =
  | { status: 'ok'; value: Value | null }
  | { status: 'error'; error: string }
  | { status: 'circular' };

async function resolveOne(
  property: Extract<Property, { source: 'inherited' }>,
  loadEntity: EntityLoader,
  path: Set<string>
): Promise<Extract<Property, { source: 'inherited' }>> {
  const sourceName = (property.from_property ?? property.name) as PropertyName;
  const r = await resolveChain(property.from_entity, sourceName, loadEntity, path);

  if (r.status === 'error') {
    return { ...property, computation_status: 'error', computation_error: r.error };
  }
  if (r.status === 'circular') {
    return { ...property, computation_status: 'circular', computation_error: 'Inheritance cycle detected' };
  }
  const next: Extract<Property, { source: 'inherited' }> = { ...property, computation_status: 'valid' };
  delete (next as { computation_error?: string }).computation_error;
  return r.value !== null ? { ...next, resolved_value: r.value } : next;
}

/**
 * Resolve the effective value of `propName` on `entityId`, following inherited
 * chains. Only the single requested property is resolved (not the whole source
 * entity), and `path` holds the active chain for cycle detection — keys are
 * added before descending and removed after, so the set never bleeds across
 * unrelated branches.
 */
async function resolveChain(
  entityId: EntityId,
  propName: PropertyName,
  loadEntity: EntityLoader,
  path: Set<string>
): Promise<ChainResult> {
  const source = await loadEntity(entityId);
  if (!source) return { status: 'error', error: `Source entity '${entityId}' not found` };

  const prop = source.properties[propName] as Property | undefined;
  if (!prop) {
    return { status: 'error', error: `Source property '${propName}' not found on entity '${entityId}'` };
  }

  // A concrete (or overridden) property yields its effective value directly.
  if (prop.source !== 'inherited' || prop.override !== undefined) {
    return { status: 'ok', value: effectiveValue(prop) };
  }

  // Inherited with no override → descend, guarding against cycles.
  const key = `${entityId}:${propName}`;
  if (path.has(key)) return { status: 'circular' };
  path.add(key);
  const result = await resolveChain(
    prop.from_entity,
    (prop.from_property ?? propName) as PropertyName,
    loadEntity,
    path
  );
  path.delete(key);
  return result;
}
