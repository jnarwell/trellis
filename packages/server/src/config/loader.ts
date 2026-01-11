/**
 * Trellis Product Configuration - YAML Loader
 *
 * Loads and parses product YAML configuration files.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { glob } from 'glob';
import * as yaml from 'js-yaml';
import type {
  ProductManifest,
  ProductIncludes,
  EntityTypeConfig,
  ViewConfig,
  NavigationConfig,
  ProductWiringConfig,
  ProductConfig,
  ViewId,
} from './types.js';

// =============================================================================
// YAML PARSING
// =============================================================================

/**
 * Load options for the YAML loader.
 */
export interface LoadOptions {
  /** Base directory for resolving relative paths */
  readonly basePath: string;

  /** Product YAML file path */
  readonly productFile: string;

  /** Whether to validate after loading */
  readonly validate?: boolean;
}

/**
 * Result of loading a YAML file.
 */
export interface YamlLoadResult<T> {
  /** The parsed content */
  readonly content: T;

  /** Source file path */
  readonly file: string;

  /** Line mappings for error reporting (line number -> yaml path) */
  readonly lineMap: Map<number, string[]>;
}

/**
 * Error thrown when YAML parsing fails.
 */
export class YamlParseError extends Error {
  public readonly file: string;
  public readonly line?: number;
  public readonly column?: number;

  constructor(
    message: string,
    file: string,
    line?: number,
    column?: number,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = 'YamlParseError';
    this.file = file;
    // Only assign if provided (exactOptionalPropertyTypes compliance)
    if (line !== undefined) this.line = line;
    if (column !== undefined) this.column = column;
  }
}

/**
 * Parse a YAML string into an object.
 */
export function parseYaml<T>(content: string, file: string): T {
  try {
    const result = yaml.load(content, {
      filename: file,
      json: true,
    });
    return result as T;
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      throw new YamlParseError(
        `YAML parse error: ${err.message}`,
        file,
        err.mark?.line,
        err.mark?.column,
        err
      );
    }
    throw err;
  }
}

/**
 * Load and parse a YAML file.
 */
export async function loadYamlFile<T>(filePath: string): Promise<YamlLoadResult<T>> {
  const absolutePath = resolve(filePath);
  const content = await readFile(absolutePath, 'utf-8');

  // Build a simple line mapping for error reporting
  const lineMap = buildLineMap(content);

  const parsed = parseYaml<T>(content, absolutePath);

  return {
    content: parsed,
    file: absolutePath,
    lineMap,
  };
}

/**
 * Build a line map for yaml content (line number -> approximate path).
 * This is a simple heuristic for error reporting.
 */
function buildLineMap(content: string): Map<number, string[]> {
  const lines = content.split('\n');
  const map = new Map<number, string[]>();
  const pathStack: string[] = [];
  let currentIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmed = line.trimStart();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    // Calculate indent (2 spaces per level)
    const indent = line.length - trimmed.length;
    const level = Math.floor(indent / 2);

    // Extract key if present
    const keyMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
    if (keyMatch && keyMatch[1]) {
      // Adjust path stack to current level
      while (pathStack.length > level) {
        pathStack.pop();
      }
      pathStack.push(keyMatch[1]);
      currentIndent = indent;
    }

    map.set(i + 1, [...pathStack]);
  }

  return map;
}

// =============================================================================
// PRODUCT LOADER
// =============================================================================

/**
 * Load a complete product configuration from disk.
 */
export async function loadProduct(options: LoadOptions): Promise<ProductConfig> {
  const { basePath, productFile } = options;
  const productPath = resolve(basePath, productFile);
  const productDir = dirname(productPath);

  // Load the product manifest
  const manifestResult = await loadYamlFile<ProductManifest>(productPath);
  const manifest = manifestResult.content;

  // Load included files
  const includes = manifest.includes ?? {};

  // Load entities
  const entities: Record<string, EntityTypeConfig> = {};
  const entityFiles = await resolveIncludes(productDir, includes.entities);
  for (const file of entityFiles) {
    const result = await loadYamlFile<EntityTypeConfig>(file);
    entities[result.content.id] = result.content;
  }

  // Load views
  const views: Record<ViewId, ViewConfig> = {} as Record<ViewId, ViewConfig>;
  const viewFiles = await resolveIncludes(productDir, includes.views);
  for (const file of viewFiles) {
    const result = await loadYamlFile<ViewConfig>(file);
    views[result.content.id] = result.content;
  }

  // Load navigation (could be in product.yaml or separate file)
  let navigation: NavigationConfig | undefined;
  const navKey = 'navigation' as keyof ProductManifest;
  if (navKey in manifest && manifest[navKey]) {
    navigation = (manifest as unknown as { navigation: NavigationConfig }).navigation;
  }

  // Load wiring (could be in product.yaml or separate file)
  let wiring: ProductWiringConfig | undefined;
  const wiringKey = 'wiring' as keyof ProductManifest;
  if (wiringKey in manifest && manifest[wiringKey]) {
    wiring = (manifest as unknown as { wiring: ProductWiringConfig }).wiring;
  }

  // Build result with optional properties (exactOptionalPropertyTypes compliance)
  const result: ProductConfig = {
    manifest,
    entities,
    views,
  };

  if (navigation) {
    return { ...result, navigation, ...(wiring ? { wiring } : {}) };
  }
  if (wiring) {
    return { ...result, wiring };
  }
  return result;
}

/**
 * Resolve include patterns to file paths.
 */
async function resolveIncludes(
  basePath: string,
  patterns: string | readonly string[] | undefined
): Promise<string[]> {
  if (!patterns) {
    return [];
  }

  const patternList = typeof patterns === 'string' ? [patterns] : [...patterns];
  const files: string[] = [];

  for (const pattern of patternList) {
    const matches = await glob(pattern, {
      cwd: basePath,
      absolute: true,
    });
    files.push(...matches);
  }

  // Sort for consistent ordering
  return files.sort();
}

/**
 * Helper to cast a string to ProductId.
 */
export function asProductId(id: string): import('./types.js').ProductId {
  return id as import('./types.js').ProductId;
}

/**
 * Helper to cast a string to ViewId.
 */
export function asViewId(id: string): ViewId {
  return id as ViewId;
}
