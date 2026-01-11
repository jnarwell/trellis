/**
 * Trellis Expression Engine - Dependency Extraction
 *
 * Extracts property dependencies from expressions at parse time
 * for staleness propagation.
 */

import type {
  Expression,
  ExpressionNode,
  PropertyReference,
  Identifier,
  PropertyPathSegment,
} from './ast.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A dependency extracted from an expression.
 */
export interface ExtractedDependency {
  /** Source entity: 'self' or entity UUID */
  readonly entityRef: 'self' | string;
  /** Property name on source entity (leaf of path) */
  readonly propertyName: string;
  /** Full path for debugging (e.g., "parent.category.markup_percentage") */
  readonly path: string;
  /** Whether this traverses a to-many relationship with [*] */
  readonly isCollection: boolean;
  /** Relationship types traversed to reach this property */
  readonly relationships: readonly string[];
}

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Extract all dependencies from an expression AST.
 */
export function extractDependencies(ast: Expression): readonly ExtractedDependency[] {
  const deps: ExtractedDependency[] = [];
  visitNode(ast.body, deps);
  return deduplicateDependencies(deps);
}

/**
 * Visit an AST node and collect dependencies.
 */
function visitNode(node: ExpressionNode, deps: ExtractedDependency[]): void {
  switch (node.type) {
    case 'PropertyReference':
      deps.push(extractFromPropertyRef(node));
      break;

    case 'Identifier':
      // #property_name -> @self.property_name
      deps.push({
        entityRef: 'self',
        propertyName: node.name,
        path: node.name,
        isCollection: false,
        relationships: [],
      });
      break;

    case 'BinaryExpression':
      visitNode(node.left, deps);
      visitNode(node.right, deps);
      break;

    case 'UnaryExpression':
      visitNode(node.argument, deps);
      break;

    case 'CallExpression':
      for (const arg of node.arguments) {
        visitNode(arg, deps);
      }
      break;

    case 'Literal':
      // No dependencies
      break;
  }
}

/**
 * Extract dependency from a PropertyReference node.
 */
function extractFromPropertyRef(node: PropertyReference): ExtractedDependency {
  const entityRef: 'self' | string =
    node.base.type === 'self' ? 'self' : node.base.id;

  // Build path and extract info
  const pathParts: string[] = [];
  const relationships: string[] = [];
  let isCollection = false;

  for (let i = 0; i < node.path.length; i++) {
    const segment = node.path[i];
    if (!segment) continue;

    pathParts.push(segment.property);

    if (segment.traversal) {
      if (segment.traversal.type === 'all') {
        isCollection = true;
        pathParts[pathParts.length - 1] += '[*]';
      } else {
        pathParts[pathParts.length - 1] += `[${segment.traversal.index}]`;
      }
    }

    // All but the last segment are relationships
    if (i < node.path.length - 1) {
      relationships.push(segment.property);
    }
  }

  // Property name is the last segment
  const lastSegment = node.path[node.path.length - 1];
  const propertyName = lastSegment ? lastSegment.property : '';

  return {
    entityRef,
    propertyName,
    path: pathParts.join('.'),
    isCollection,
    relationships,
  };
}

/**
 * Remove duplicate dependencies.
 */
function deduplicateDependencies(
  deps: ExtractedDependency[]
): readonly ExtractedDependency[] {
  const seen = new Set<string>();
  const result: ExtractedDependency[] = [];

  for (const dep of deps) {
    const key = `${dep.entityRef}.${dep.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(dep);
    }
  }

  return result;
}

// =============================================================================
// DEPENDENCY RESOLUTION
// =============================================================================

/**
 * Resolved dependency with concrete entity ID.
 */
export interface ResolvedDependency {
  /** Concrete entity ID */
  readonly entityId: string;
  /** Property name */
  readonly propertyName: string;
}

/**
 * Context for resolving dependencies.
 */
export interface DependencyResolutionContext {
  /** Current entity ID (for 'self' references) */
  readonly currentEntityId: string;
  /** Function to resolve relationships to entity IDs */
  readonly resolveRelationship: (
    entityId: string,
    relationshipType: string
  ) => Promise<readonly string[]>;
}

/**
 * Resolve extracted dependencies to concrete entity IDs.
 *
 * For 'self' references, uses currentEntityId.
 * For relationship traversals, queries related entities.
 */
export async function resolveDependencies(
  dependencies: readonly ExtractedDependency[],
  ctx: DependencyResolutionContext
): Promise<readonly ResolvedDependency[]> {
  const resolved: ResolvedDependency[] = [];

  for (const dep of dependencies) {
    // Resolve base entity
    let entityIds: string[];

    if (dep.entityRef === 'self') {
      entityIds = [ctx.currentEntityId];
    } else {
      entityIds = [dep.entityRef];
    }

    // Traverse relationships
    for (const relType of dep.relationships) {
      const nextEntityIds: string[] = [];
      for (const entityId of entityIds) {
        const relatedIds = await ctx.resolveRelationship(entityId, relType);
        nextEntityIds.push(...relatedIds);
      }
      entityIds = nextEntityIds;
    }

    // Add resolved dependencies
    for (const entityId of entityIds) {
      resolved.push({
        entityId,
        propertyName: dep.propertyName,
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return resolved.filter((r) => {
    const key = `${r.entityId}.${r.propertyName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =============================================================================
// ANALYSIS UTILITIES
// =============================================================================

/**
 * Check if expression uses any collection traversal ([*]).
 */
export function hasCollectionTraversal(ast: Expression): boolean {
  let found = false;

  function visit(node: ExpressionNode): void {
    if (found) return;

    if (node.type === 'PropertyReference') {
      for (const segment of node.path) {
        if (segment.traversal?.type === 'all') {
          found = true;
          return;
        }
      }
    }

    if (node.type === 'BinaryExpression') {
      visit(node.left);
      visit(node.right);
    } else if (node.type === 'UnaryExpression') {
      visit(node.argument);
    } else if (node.type === 'CallExpression') {
      node.arguments.forEach(visit);
    }
  }

  visit(ast.body);
  return found;
}

/**
 * Get all referenced entity IDs (from @{uuid} syntax).
 */
export function getReferencedEntityIds(ast: Expression): readonly string[] {
  const ids: string[] = [];

  function visit(node: ExpressionNode): void {
    if (node.type === 'PropertyReference' && node.base.type === 'entity') {
      ids.push(node.base.id);
    }

    if (node.type === 'BinaryExpression') {
      visit(node.left);
      visit(node.right);
    } else if (node.type === 'UnaryExpression') {
      visit(node.argument);
    } else if (node.type === 'CallExpression') {
      node.arguments.forEach(visit);
    }
  }

  visit(ast.body);
  return [...new Set(ids)];
}

/**
 * Get all function names used in expression.
 */
export function getUsedFunctions(ast: Expression): readonly string[] {
  const funcs: string[] = [];

  function visit(node: ExpressionNode): void {
    if (node.type === 'CallExpression') {
      funcs.push(node.callee);
      node.arguments.forEach(visit);
    }

    if (node.type === 'BinaryExpression') {
      visit(node.left);
      visit(node.right);
    } else if (node.type === 'UnaryExpression') {
      visit(node.argument);
    }
  }

  visit(ast.body);
  return [...new Set(funcs)];
}
