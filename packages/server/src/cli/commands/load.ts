/**
 * Trellis CLI - Load Command
 *
 * Loads a product definition into the database.
 */

import type { Command } from 'commander';
import type { BlockRegistry } from '@trellis/kernel';
import { createProductLoader, type ProductLoaderDb } from '../../loader/product-loader.js';
import type { LoaderEvent, LoadResult } from '../../loader/types.js';

/**
 * Options for the load command.
 */
export interface LoadCommandOptions {
  readonly force?: boolean;
  readonly dryRun?: boolean;
  readonly skipSeed?: boolean;
  readonly quiet?: boolean;
}

/**
 * Register the load command.
 */
export function registerLoadCommand(
  program: Command,
  getDb: () => Promise<ProductLoaderDb>,
  getBlockRegistry: () => BlockRegistry
): void {
  program
    .command('load <product>')
    .description('Load a product definition into the database')
    .option('-f, --force', 'Overwrite existing schemas')
    .option('--dry-run', 'Validate only, do not write to database')
    .option('--skip-seed', 'Skip loading seed data')
    .option('-q, --quiet', 'Suppress progress output')
    .action(async (product: string, options: LoadCommandOptions) => {
      await executeLoadCommand(product, options, getDb, getBlockRegistry);
    });
}

/**
 * Execute the load command.
 */
export async function executeLoadCommand(
  productPath: string,
  options: LoadCommandOptions,
  getDb: () => Promise<ProductLoaderDb>,
  getBlockRegistry: () => BlockRegistry
): Promise<void> {
  const db = await getDb();
  const blockRegistry = getBlockRegistry();
  const loader = createProductLoader(db, blockRegistry);

  // Set up event handler for progress
  if (!options.quiet) {
    loader.onEvent((event) => {
      printEvent(event);
    });
  }

  console.log(`\nLoading product: ${productPath}`);
  if (options.dryRun) {
    console.log('(dry run - no changes will be made)\n');
  } else {
    console.log('');
  }

  const result = await loader.load(productPath, {
    ...(options.force !== undefined ? { force: options.force } : {}),
    ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
    ...(options.skipSeed !== undefined ? { skipSeed: options.skipSeed } : {}),
  });

  printResult(result, options);

  if (!result.success) {
    process.exitCode = 1;
  }
}

/**
 * Print a loader event to console.
 */
function printEvent(event: LoaderEvent): void {
  switch (event.type) {
    case 'load_started':
      console.log(`  Starting load for product: ${event.productId}`);
      break;

    case 'validation_complete':
      if (event.valid) {
        console.log('  Validation passed');
      } else {
        console.log(`  Validation failed with ${event.errorCount} error(s)`);
      }
      break;

    case 'entity_type_created':
      console.log(`  Created entity type: ${event.typeId} (${event.name})`);
      break;

    case 'entity_type_updated':
      console.log(`  Updated entity type: ${event.typeId} (${event.name})`);
      break;

    case 'relationship_type_created':
      console.log(`  Created relationship type: ${event.relType} (${event.name})`);
      break;

    case 'entity_seeded':
      console.log(`  Seeded entity: ${event.entityType} (${event.id})`);
      break;

    case 'load_complete':
      // Handled in printResult
      break;

    case 'load_error':
      console.error(`  Error: ${event.error}`);
      break;
  }
}

/**
 * Print the final result.
 */
function printResult(result: LoadResult, options: LoadCommandOptions): void {
  console.log('');

  if (result.success) {
    console.log('Load completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  Product ID:          ${result.productId}`);
    console.log(`  Tenant ID:           ${result.tenantId}`);
    console.log(`  Entity types:        ${result.entityTypesCreated}`);
    console.log(`  Relationship types:  ${result.relationshipTypesCreated}`);
    console.log(`  Entities seeded:     ${result.entitiesSeeded}`);
    console.log(`  Duration:            ${result.durationMs}ms`);

    if (result.warnings.length > 0) {
      console.log('');
      console.log(`Warnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        console.log(`  - [${warning.code}] ${warning.message}`);
        if (warning.suggestion) {
          console.log(`    Suggestion: ${warning.suggestion}`);
        }
      }
    }
  } else {
    console.log('Load failed!');
    console.log('');
    console.log(`Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`  - [${error.code}] ${error.message}`);
      if (error.path.length > 0) {
        console.log(`    Path: ${error.path.join('.')}`);
      }
      if (error.suggestions.length > 0) {
        console.log(`    Suggestions: ${error.suggestions.join(', ')}`);
      }
    }
  }
}
