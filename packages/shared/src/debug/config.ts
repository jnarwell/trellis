/**
 * @trellis/shared - Debug Configuration
 *
 * Configuration for debug mode, capture settings, and reporters.
 */

import type { DebugReporter } from './types.js';

// =============================================================================
// DEBUG MODE
// =============================================================================

/**
 * Debug mode levels.
 *
 * - 'off': No debug capture (production default)
 * - 'errors': Only capture on errors
 * - 'verbose': Capture with full context
 * - 'trace': Capture with step-by-step tracing
 */
export type DebugMode = 'off' | 'errors' | 'verbose' | 'trace';

// =============================================================================
// DEBUG CONFIG
// =============================================================================

/**
 * Debug configuration options.
 */
export interface DebugConfig {
  /** Debug mode level */
  mode: DebugMode;

  /** Capture stack traces (adds overhead) */
  captureStacks: boolean;

  /** Maximum depth for object serialization */
  maxDepth: number;

  /** Maximum array length in traces */
  maxArrayLength: number;

  /** Include timing information */
  timing: boolean;

  /** Maximum number of evaluation steps to keep */
  maxTraceSteps: number;

  /** Registered reporters */
  reporters: DebugReporter[];

  /** Application version (for context) */
  version: string;
}

// =============================================================================
// DEFAULT CONFIGS
// =============================================================================

/**
 * Production configuration - minimal overhead.
 */
export const productionConfig: Readonly<DebugConfig> = {
  mode: 'off',
  captureStacks: false,
  maxDepth: 3,
  maxArrayLength: 10,
  timing: false,
  maxTraceSteps: 50,
  reporters: [],
  version: '0.0.0',
};

/**
 * Development configuration - full debugging.
 */
export const developmentConfig: Readonly<DebugConfig> = {
  mode: 'verbose',
  captureStacks: true,
  maxDepth: 5,
  maxArrayLength: 20,
  timing: true,
  maxTraceSteps: 100,
  reporters: [],
  version: '0.0.0',
};

/**
 * Test configuration - trace everything.
 */
export const testConfig: Readonly<DebugConfig> = {
  mode: 'trace',
  captureStacks: true,
  maxDepth: 10,
  maxArrayLength: 50,
  timing: true,
  maxTraceSteps: 200,
  reporters: [],
  version: '0.0.0',
};

// =============================================================================
// GLOBAL CONFIG
// =============================================================================

/**
 * Current debug configuration (mutable singleton).
 */
let currentConfig: DebugConfig = { ...developmentConfig };

/**
 * Get the current debug configuration.
 */
export function getDebugConfig(): Readonly<DebugConfig> {
  return currentConfig;
}

/**
 * Configure debug settings.
 */
export function configureDebug(config: Partial<DebugConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Reset debug configuration to defaults based on NODE_ENV.
 */
export function resetDebugConfig(): void {
   
  const globalAny = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const env = globalAny.process?.env?.['NODE_ENV'] ?? 'development';

  if (env === 'production') {
    currentConfig = { ...productionConfig };
  } else if (env === 'test') {
    currentConfig = { ...testConfig };
  } else {
    currentConfig = { ...developmentConfig };
  }
}

/**
 * Add a debug reporter.
 */
export function addReporter(reporter: DebugReporter): void {
  currentConfig.reporters = [...currentConfig.reporters, reporter];
}

/**
 * Remove a debug reporter by name.
 */
export function removeReporter(name: string): void {
  currentConfig.reporters = currentConfig.reporters.filter((r) => r.name !== name);
}

/**
 * Clear all reporters.
 */
export function clearReporters(): void {
  currentConfig.reporters = [];
}

// =============================================================================
// MODE HELPERS
// =============================================================================

/**
 * Check if debug mode is enabled (any level except 'off').
 */
export function isDebugEnabled(): boolean {
  return currentConfig.mode !== 'off';
}

/**
 * Check if we should capture errors.
 */
export function shouldCaptureErrors(): boolean {
  return currentConfig.mode !== 'off';
}

/**
 * Check if we should capture verbose context.
 */
export function shouldCaptureVerbose(): boolean {
  return currentConfig.mode === 'verbose' || currentConfig.mode === 'trace';
}

/**
 * Check if we should capture traces.
 */
export function shouldCaptureTraces(): boolean {
  return currentConfig.mode === 'trace';
}

/**
 * Check if stack traces should be captured.
 */
export function shouldCaptureStacks(): boolean {
  return currentConfig.captureStacks;
}

/**
 * Check if timing should be captured.
 */
export function shouldCaptureTiming(): boolean {
  return currentConfig.timing;
}

// =============================================================================
// SERIALIZATION HELPERS
// =============================================================================

/**
 * Safely serialize a value for debug output.
 * Respects maxDepth and maxArrayLength config.
 */
export function safeSerialize(value: unknown, depth = 0): unknown {
  const config = getDebugConfig();

  if (depth > config.maxDepth) {
    return '[Max depth exceeded]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: config.captureStacks ? value.stack : undefined,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (value.length > config.maxArrayLength) {
      const truncated = value.slice(0, config.maxArrayLength).map((v) => safeSerialize(v, depth + 1));
      return [...truncated, `... and ${value.length - config.maxArrayLength} more`];
    }
    return value.map((v) => safeSerialize(v, depth + 1));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    const entries = Object.entries(value);

    for (const [key, val] of entries) {
      // Skip private/internal properties
      if (key.startsWith('_')) continue;
      result[key] = safeSerialize(val, depth + 1);
    }

    return result;
  }

  return value;
}

// =============================================================================
// INITIALIZATION
// =============================================================================

// Initialize config based on environment on module load
resetDebugConfig();
