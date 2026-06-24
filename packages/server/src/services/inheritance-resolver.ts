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
      return property.cached_value ?? null;
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
  loadEntity: EntityLoader,
  visited: Set<string> = new Set()
): Promise<InheritanceResolveResult> {
  let changed = false;
  const nextProperties: Record<string, Property> = { ...entity.properties };

  for (const [name, property] of Object.entries(entity.properties)) {
    if (property.source !== 'inherited') continue;
    // An explicit override wins and needs no source lookup.
    if (property.override !== undefined) continue;

    const key = `${entity.id}:${name}`;
    if (visited.has(key)) {
      nextProperties[name] = {
        ...property,
        computation_status: 'circular',
        computation_error: 'Inheritance cycle detected',
      };
      changed = true;
      continue;
    }
    visited.add(key);

    const resolved = await resolveOne(property, loadEntity, visited);
    // Only mark changed if something actually differs.
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

async function resolveOne(
  property: Extract<Property, { source: 'inherited' }>,
  loadEntity: EntityLoader,
  visited: Set<string>
): Promise<Extract<Property, { source: 'inherited' }>> {
  const source = await loadEntity(property.from_entity);
  if (!source) {
    return {
      ...property,
      computation_status: 'error',
      computation_error: `Source entity '${property.from_entity}' not found`,
    };
  }

  const sourceName = (property.from_property ?? property.name) as PropertyName;
  const sourceProp = source.properties[sourceName] as Property | undefined;
  if (!sourceProp) {
    return {
      ...property,
      computation_status: 'error',
      computation_error: `Source property '${sourceName}' not found on entity '${property.from_entity}'`,
    };
  }

  // If the source itself inherits, resolve it first so we read a real value.
  let resolvedSourceProp = sourceProp;
  if (sourceProp.source === 'inherited' && sourceProp.override === undefined) {
    const sourceResult = await resolveInheritance(source, loadEntity, visited);
    resolvedSourceProp =
      (sourceResult.entity.properties[sourceName] as Property | undefined) ?? sourceProp;

    // Propagate an unresolvable source (cycle or error) up the chain instead of
    // silently resolving to null.
    if (
      resolvedSourceProp.source === 'inherited' &&
      (resolvedSourceProp.computation_status === 'circular' ||
        resolvedSourceProp.computation_status === 'error')
    ) {
      return {
        ...property,
        computation_status: resolvedSourceProp.computation_status,
        computation_error:
          resolvedSourceProp.computation_error ??
          (resolvedSourceProp.computation_status === 'circular'
            ? 'Inheritance cycle detected'
            : 'Source property could not be resolved'),
      };
    }
  }

  const value = effectiveValue(resolvedSourceProp);
  const next: Extract<Property, { source: 'inherited' }> = {
    ...property,
    computation_status: 'valid',
  };
  // Drop a stale error message; attach the resolved value when present.
  delete (next as { computation_error?: string }).computation_error;
  if (value !== null) {
    return { ...next, resolved_value: value };
  }
  return next;
}
