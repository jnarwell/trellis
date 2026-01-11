/**
 * Trellis CLI - Serve Command
 *
 * Loads a product and starts the server.
 */

import type { Command } from 'commander';
import type { BlockRegistry } from '@trellis/kernel';
import { createProductLoader, type ProductLoaderDb } from '../../loader/product-loader.js';

/**
 * Options for the serve command.
 */
export interface ServeCommandOptions {
  readonly port?: string;
  readonly host?: string;
  readonly skipLoad?: boolean;
  readonly force?: boolean;
}

/**
 * Server start function type.
 * This should be provided by the main application.
 */
export type StartServerFn = (options: {
  port: number;
  host: string;
  productId: string;
  tenantId: string;
}) => Promise<void>;

/**
 * Register the serve command.
 */
export function registerServeCommand(
  program: Command,
  getDb: () => Promise<ProductLoaderDb>,
  getBlockRegistry: () => BlockRegistry,
  startServer: StartServerFn
): void {
  program
    .command('serve <product>')
    .description('Load a product and start the server')
    .option('-p, --port <port>', 'Port number', '3000')
    .option('-h, --host <host>', 'Host to bind to', 'localhost')
    .option('--skip-load', 'Skip loading product (assumes already loaded)')
    .option('-f, --force', 'Force reload product schemas')
    .action(async (product: string, options: ServeCommandOptions) => {
      await executeServeCommand(
        product,
        options,
        getDb,
        getBlockRegistry,
        startServer
      );
    });
}

/**
 * Execute the serve command.
 */
export async function executeServeCommand(
  productPath: string,
  options: ServeCommandOptions,
  getDb: () => Promise<ProductLoaderDb>,
  getBlockRegistry: () => BlockRegistry,
  startServer: StartServerFn
): Promise<void> {
  const db = await getDb();
  const blockRegistry = getBlockRegistry();
  const loader = createProductLoader(db, blockRegistry);

  const port = parseInt(options.port ?? '3000', 10);
  const host = options.host ?? 'localhost';

  let productId: string;
  let tenantId: string;

  if (options.skipLoad) {
    // Extract product ID from path for reference
    productId = extractProductId(productPath);
    // Look up tenant by product slug
    const tenant = await db.tenants.findFirst({
      where: { slug: productId.toLowerCase().replace(/[^a-z0-9-]/g, '-') },
    });

    if (!tenant) {
      console.error(
        `Product '${productId}' not found in database. Load it first or remove --skip-load.`
      );
      process.exitCode = 1;
      return;
    }

    tenantId = tenant.id;
    console.log(`\nUsing existing product: ${productId}`);
  } else {
    // Load the product first
    console.log(`\nLoading product: ${productPath}`);

    loader.onEvent((event) => {
      if (event.type === 'entity_type_created') {
        console.log(`  Created entity type: ${event.typeId}`);
      } else if (event.type === 'entity_type_updated') {
        console.log(`  Updated entity type: ${event.typeId}`);
      } else if (event.type === 'load_error') {
        console.error(`  Error: ${event.error}`);
      }
    });

    const result = await loader.load(productPath, {
      ...(options.force !== undefined ? { force: options.force } : {}),
      skipSeed: false,
    });

    if (!result.success) {
      console.error('\nFailed to load product:');
      for (const error of result.errors) {
        console.error(`  - [${error.code}] ${error.message}`);
      }
      process.exitCode = 1;
      return;
    }

    productId = result.productId;
    tenantId = result.tenantId;

    console.log(`\nProduct loaded successfully!`);
    console.log(`  Entity types: ${result.entityTypesCreated}`);
    console.log(`  Entities seeded: ${result.entitiesSeeded}`);
  }

  // Start the server
  console.log(`\nStarting server...`);
  console.log(`  Product: ${productId}`);
  console.log(`  Tenant: ${tenantId}`);
  console.log(`  URL: http://${host}:${port}`);
  console.log('');

  await startServer({
    port,
    host,
    productId,
    tenantId,
  });
}

/**
 * Extract product ID from a file path.
 */
function extractProductId(productPath: string): string {
  // Remove extension and path
  const filename = productPath.split('/').pop() ?? productPath;
  return filename.replace(/\.(ya?ml)$/i, '').replace(/^product\.?/, '');
}
