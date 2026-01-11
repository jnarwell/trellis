/**
 * Trellis CLI - Entry Point
 *
 * Command-line interface for managing Trellis products.
 *
 * Usage:
 *   trellis load <product>      Load a product definition
 *   trellis validate <product>  Validate a product definition
 *   trellis serve <product>     Load product and start server
 */

import { Command } from 'commander';
import type { BlockRegistry } from '@trellis/kernel';
import type { ProductLoaderDb } from '../loader/product-loader.js';
import { registerLoadCommand } from './commands/load.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerServeCommand, type StartServerFn } from './commands/serve.js';

/**
 * CLI configuration options.
 */
export interface CliConfig {
  /** Function to get database client */
  readonly getDb: () => Promise<ProductLoaderDb>;

  /** Function to get block registry */
  readonly getBlockRegistry: () => BlockRegistry;

  /** Function to start the server (for serve command) */
  readonly startServer: StartServerFn;

  /** CLI version string */
  readonly version?: string;

  /** CLI name */
  readonly name?: string;
}

/**
 * Create and configure the CLI program.
 */
export function createCli(config: CliConfig): Command {
  const program = new Command();

  program
    .name(config.name ?? 'trellis')
    .description('Trellis Product CLI - Manage and run Trellis products')
    .version(config.version ?? '0.1.0');

  // Register commands
  registerLoadCommand(program, config.getDb, config.getBlockRegistry);
  registerValidateCommand(program, config.getDb, config.getBlockRegistry);
  registerServeCommand(
    program,
    config.getDb,
    config.getBlockRegistry,
    config.startServer
  );

  return program;
}

/**
 * Run the CLI with the given arguments.
 */
export async function runCli(
  config: CliConfig,
  args: string[] = process.argv
): Promise<void> {
  const program = createCli(config);
  await program.parseAsync(args);
}

// Re-export command types
export type { LoadCommandOptions } from './commands/load.js';
export type { ValidateCommandOptions } from './commands/validate.js';
export type { ServeCommandOptions, StartServerFn } from './commands/serve.js';
