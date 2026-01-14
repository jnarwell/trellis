/**
 * Trellis Server - Config Routes
 *
 * API routes for serving product configurations.
 * Products are defined as YAML files and served as JSON.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import * as yaml from 'js-yaml';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Route parameters for product config.
 */
interface ProductParams {
  productId: string;
}

/**
 * Options for config routes.
 */
export interface ConfigRoutesOptions {
  /** Directory containing product config files */
  productsDir: string;
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * List available product configurations.
 */
async function listProductsHandler(
  this: FastifyInstance & { productsDir: string },
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const productsDir = this.productsDir;

    // Check if directory exists
    try {
      await stat(productsDir);
    } catch {
      reply.status(200).send({ products: [] });
      return;
    }

    // Read directory contents
    const entries = await readdir(productsDir, { withFileTypes: true });

    // Find all .yaml and .yml files
    const products = entries
      .filter((entry) => {
        if (entry.isFile()) {
          const name = entry.name.toLowerCase();
          return name.endsWith('.yaml') || name.endsWith('.yml');
        }
        return false;
      })
      .map((entry) => {
        const name = entry.name;
        const id = name.replace(/\.ya?ml$/i, '');
        return { id, file: name };
      });

    reply.status(200).send({ products });
  } catch (err) {
    request.log.error({ err }, 'Failed to list products');
    reply.status(500).send({
      error: 'Failed to list products',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * Get a specific product configuration.
 */
async function getProductHandler(
  this: FastifyInstance & { productsDir: string },
  request: FastifyRequest<{ Params: ProductParams }>,
  reply: FastifyReply
): Promise<void> {
  const { productId } = request.params;

  try {
    const productsDir = this.productsDir;

    // Try both .yaml and .yml extensions
    let filePath: string | null = null;
    let content: string | null = null;

    for (const ext of ['.yaml', '.yml']) {
      const tryPath = join(productsDir, `${productId}${ext}`);
      try {
        content = await readFile(tryPath, 'utf-8');
        filePath = tryPath;
        break;
      } catch {
        // Try next extension
      }
    }

    if (!content || !filePath) {
      reply.status(404).send({
        error: 'Product not found',
        message: `No configuration found for product: ${productId}`,
      });
      return;
    }

    // Parse YAML to JSON
    const config = yaml.load(content);

    // Add metadata
    const response = {
      ...config as object,
      _meta: {
        id: productId,
        file: basename(filePath),
        loadedAt: new Date().toISOString(),
      },
    };

    reply.status(200).send(response);
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      request.log.error({ err }, 'YAML parse error');
      reply.status(400).send({
        error: 'Invalid YAML',
        message: err.message,
        mark: err.mark ? {
          line: err.mark.line,
          column: err.mark.column,
        } : undefined,
      });
      return;
    }

    request.log.error({ err }, 'Failed to load product');
    reply.status(500).send({
      error: 'Failed to load product',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

/**
 * Validate a product configuration without loading it fully.
 */
async function validateProductHandler(
  this: FastifyInstance & { productsDir: string },
  request: FastifyRequest<{ Params: ProductParams }>,
  reply: FastifyReply
): Promise<void> {
  const { productId } = request.params;

  try {
    const productsDir = this.productsDir;

    // Try both .yaml and .yml extensions
    let content: string | null = null;

    for (const ext of ['.yaml', '.yml']) {
      const tryPath = join(productsDir, `${productId}${ext}`);
      try {
        content = await readFile(tryPath, 'utf-8');
        break;
      } catch {
        // Try next extension
      }
    }

    if (!content) {
      reply.status(404).send({
        error: 'Product not found',
        message: `No configuration found for product: ${productId}`,
      });
      return;
    }

    // Parse YAML - this validates syntax
    const config = yaml.load(content) as Record<string, unknown>;

    // Basic structural validation
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config['name']) {
      errors.push('Missing required field: name');
    }
    if (!config['version']) {
      warnings.push('Missing recommended field: version');
    }
    if (!config['defaultView']) {
      errors.push('Missing required field: defaultView');
    }
    if (!config['views']) {
      errors.push('Missing required field: views');
    } else if (!Array.isArray(config['views'])) {
      errors.push('Field "views" must be an array');
    }

    reply.status(200).send({
      valid: errors.length === 0,
      errors,
      warnings,
    });
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      reply.status(200).send({
        valid: false,
        errors: [`YAML syntax error: ${err.message}`],
        warnings: [],
      });
      return;
    }

    request.log.error({ err }, 'Failed to validate product');
    reply.status(500).send({
      error: 'Failed to validate product',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// ROUTE REGISTRATION
// =============================================================================

/**
 * Register config routes.
 */
export async function configRoutes(
  app: FastifyInstance,
  options: ConfigRoutesOptions
): Promise<void> {
  // Store products directory on the instance for handlers
  const decoratedApp = app as FastifyInstance & { productsDir: string };
  decoratedApp.productsDir = resolve(options.productsDir);

  // GET /config/products - List available products
  app.get('/config/products', listProductsHandler.bind(decoratedApp));

  // GET /config/products/:productId - Get product config
  app.get<{ Params: ProductParams }>(
    '/config/products/:productId',
    getProductHandler.bind(decoratedApp)
  );

  // GET /config/products/:productId/validate - Validate product config
  app.get<{ Params: ProductParams }>(
    '/config/products/:productId/validate',
    validateProductHandler.bind(decoratedApp)
  );
}

/**
 * Create config routes plugin with default options.
 */
export function createConfigRoutes(productsDir: string) {
  return async (app: FastifyInstance) => {
    await configRoutes(app, { productsDir });
  };
}
