/**
 * Trellis CLI - Validate Command
 *
 * Validates a product definition without loading it.
 */

import type { Command } from 'commander';
import type { BlockRegistry } from '@trellis/kernel';
import { createProductLoader, type ProductLoaderDb } from '../../loader/product-loader.js';
import type { LoadResult } from '../../loader/types.js';

/**
 * Options for the validate command.
 */
export interface ValidateCommandOptions {
  readonly verbose?: boolean;
  readonly json?: boolean;
}

/**
 * Register the validate command.
 */
export function registerValidateCommand(
  program: Command,
  getDb: () => Promise<ProductLoaderDb>,
  getBlockRegistry: () => BlockRegistry
): void {
  program
    .command('validate <product>')
    .description('Validate a product definition without loading it')
    .option('-v, --verbose', 'Show detailed validation output')
    .option('--json', 'Output results as JSON')
    .action(async (product: string, options: ValidateCommandOptions) => {
      await executeValidateCommand(product, options, getDb, getBlockRegistry);
    });
}

/**
 * Execute the validate command.
 */
export async function executeValidateCommand(
  productPath: string,
  options: ValidateCommandOptions,
  getDb: () => Promise<ProductLoaderDb>,
  getBlockRegistry: () => BlockRegistry
): Promise<void> {
  const db = await getDb();
  const blockRegistry = getBlockRegistry();
  const loader = createProductLoader(db, blockRegistry);

  console.log(`\nValidating product: ${productPath}\n`);

  const result = await loader.validate(productPath);

  if (options.json) {
    printJsonResult(result);
  } else {
    printHumanResult(result, options.verbose ?? false);
  }

  if (!result.success) {
    process.exitCode = 1;
  }
}

/**
 * Print result as JSON.
 */
function printJsonResult(result: LoadResult): void {
  const output = {
    valid: result.success,
    productId: result.productId,
    entityTypesCount: result.entityTypesCreated,
    errors: result.errors.map((e) => ({
      code: e.code,
      category: e.category,
      message: e.message,
      path: e.path.join('.'),
      suggestions: e.suggestions,
    })),
    warnings: result.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      path: w.path.join('.'),
    })),
    durationMs: result.durationMs,
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Print result in human-readable format.
 */
function printHumanResult(result: LoadResult, verbose: boolean): void {
  if (result.success) {
    console.log('Validation PASSED');
    console.log('');
    console.log(`  Product ID:    ${result.productId}`);
    console.log(`  Entity types:  ${result.entityTypesCreated}`);
    console.log(`  Duration:      ${result.durationMs}ms`);
  } else {
    console.log('Validation FAILED');
    console.log('');
    console.log(`Errors (${result.errors.length}):`);

    for (const error of result.errors) {
      console.log('');
      console.log(`  ${error.code}`);
      console.log(`    ${error.message}`);

      if (verbose) {
        console.log(`    Category: ${error.category}`);
        if (error.path.length > 0) {
          console.log(`    Path: ${error.path.join('.')}`);
        }
        if (error.location) {
          console.log(
            `    Location: ${error.location.file}:${error.location.line}:${error.location.column}`
          );
        }
      }

      if (error.suggestions.length > 0) {
        console.log(`    Suggestions: ${error.suggestions.join(', ')}`);
      }
    }
  }

  if (result.warnings.length > 0) {
    console.log('');
    console.log(`Warnings (${result.warnings.length}):`);

    for (const warning of result.warnings) {
      console.log(`  - [${warning.code}] ${warning.message}`);
      if (verbose && warning.path.length > 0) {
        console.log(`    Path: ${warning.path.join('.')}`);
      }
      if (warning.suggestion) {
        console.log(`    Suggestion: ${warning.suggestion}`);
      }
    }
  }
}
