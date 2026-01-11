/**
 * Trellis E2E Debug Reporter
 *
 * Custom Playwright reporter that captures DebugContext from failed tests
 * and outputs AI-friendly debug information.
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullConfig,
  Suite,
  FullResult,
} from '@playwright/test/reporter';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Import debug formatting utilities (will be available after build)
// import { formatForAI, formatReport, type DebugContext } from '@trellis/shared/debug';

// =============================================================================
// DEBUG CONTEXT EXTRACTION
// =============================================================================

/**
 * Pattern to match JSON DebugContext in console output.
 */
const DEBUG_CONTEXT_PATTERN = /\{"id":"dbg_[^}]+\}/g;

/**
 * Simplified DebugContext interface for the reporter.
 */
interface DebugContext {
  id: string;
  timestamp: string;
  operation: string;
  error: {
    code: string;
    message: string;
    category: string;
  };
  suggestions: string[];
  docs?: string[];
}

/**
 * Extract DebugContext objects from test attachments and console output.
 */
function extractDebugContexts(result: TestResult): DebugContext[] {
  const contexts: DebugContext[] = [];

  // Check for debug context in attachments
  for (const attachment of result.attachments) {
    if (attachment.name === 'debug-context' && attachment.body) {
      try {
        const ctx = JSON.parse(attachment.body.toString()) as DebugContext;
        contexts.push(ctx);
      } catch {
        // Ignore parse errors
      }
    }
  }

  // Check for debug context in stdout/stderr
  if (result.stdout) {
    for (const line of result.stdout) {
      const matches = line.toString().match(DEBUG_CONTEXT_PATTERN);
      if (matches) {
        for (const match of matches) {
          try {
            const ctx = JSON.parse(match) as DebugContext;
            contexts.push(ctx);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  if (result.stderr) {
    for (const line of result.stderr) {
      const matches = line.toString().match(DEBUG_CONTEXT_PATTERN);
      if (matches) {
        for (const match of matches) {
          try {
            const ctx = JSON.parse(match) as DebugContext;
            contexts.push(ctx);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  return contexts;
}

// =============================================================================
// AI-FRIENDLY FORMATTING
// =============================================================================

/**
 * Format a DebugContext for AI analysis.
 */
function formatContextForAI(ctx: DebugContext): string {
  const lines: string[] = [];

  lines.push(`## Error: ${ctx.error.code}`);
  lines.push('');
  lines.push(`**Message:** ${ctx.error.message}`);
  lines.push('');
  lines.push(`**Operation:** ${ctx.operation}`);
  lines.push('');
  lines.push(`**Category:** ${ctx.error.category}`);
  lines.push('');

  if (ctx.suggestions.length > 0) {
    lines.push('### Suggestions');
    lines.push('');
    for (const suggestion of ctx.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push('');
  }

  if (ctx.docs && ctx.docs.length > 0) {
    lines.push('### Relevant Docs');
    lines.push('');
    for (const doc of ctx.docs) {
      lines.push(`- [${doc}](${doc})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// REPORTER IMPLEMENTATION
// =============================================================================

/**
 * Trellis Debug Reporter for Playwright.
 *
 * Captures DebugContext from failed tests and outputs:
 * 1. AI-friendly debug information to console
 * 2. Debug artifacts for CI uploads
 */
class TrellisDebugReporter implements Reporter {
  private outputDir: string;
  private failedTests: Map<string, { test: TestCase; result: TestResult; contexts: DebugContext[] }> =
    new Map();

  constructor(options: { outputDir?: string } = {}) {
    this.outputDir = options.outputDir ?? 'tests/e2e/debug-output';
  }

  onBegin(config: FullConfig, suite: Suite): void {
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    console.log(`\n[Trellis Debug Reporter] Output directory: ${this.outputDir}\n`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'failed' || result.status === 'timedOut') {
      const contexts = extractDebugContexts(result);

      this.failedTests.set(test.id, { test, result, contexts });

      // Output to console immediately
      if (contexts.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log(`DEBUG CONTEXT for: ${test.title}`);
        console.log('='.repeat(60));

        for (const ctx of contexts) {
          console.log('\n' + formatContextForAI(ctx));
        }

        console.log('='.repeat(60) + '\n');
      }
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    // Write summary file
    if (this.failedTests.size > 0) {
      const summary = this.generateSummary();
      const summaryPath = join(this.outputDir, 'debug-summary.md');
      writeFileSync(summaryPath, summary);
      console.log(`\n[Trellis Debug Reporter] Summary written to: ${summaryPath}`);

      // Write individual debug files
      for (const [testId, { test, contexts }] of this.failedTests) {
        if (contexts.length > 0) {
          const filename = this.sanitizeFilename(test.title);
          const debugPath = join(this.outputDir, `${filename}.md`);

          const content = this.generateTestDebugFile(test, contexts);
          writeFileSync(debugPath, content);
        }
      }

      // Write raw JSON for programmatic access
      const allContexts = Array.from(this.failedTests.values()).flatMap((f) => f.contexts);
      if (allContexts.length > 0) {
        const jsonPath = join(this.outputDir, 'debug-contexts.json');
        writeFileSync(jsonPath, JSON.stringify(allContexts, null, 2));
        console.log(`[Trellis Debug Reporter] JSON written to: ${jsonPath}`);
      }
    }

    console.log(
      `\n[Trellis Debug Reporter] ${this.failedTests.size} failed tests with debug context\n`
    );
  }

  private generateSummary(): string {
    const lines: string[] = [];

    lines.push('# E2E Test Debug Summary');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`Total Failed Tests: ${this.failedTests.size}`);
    lines.push('');

    // Error code breakdown
    const errorCounts = new Map<string, number>();
    for (const { contexts } of this.failedTests.values()) {
      for (const ctx of contexts) {
        const count = errorCounts.get(ctx.error.code) ?? 0;
        errorCounts.set(ctx.error.code, count + 1);
      }
    }

    if (errorCounts.size > 0) {
      lines.push('## Error Code Summary');
      lines.push('');
      lines.push('| Error Code | Count |');
      lines.push('|------------|-------|');
      for (const [code, count] of errorCounts) {
        lines.push(`| ${code} | ${count} |`);
      }
      lines.push('');
    }

    // Test list
    lines.push('## Failed Tests');
    lines.push('');
    for (const { test, contexts } of this.failedTests.values()) {
      const ctxCount = contexts.length;
      lines.push(`- **${test.title}** (${ctxCount} debug context${ctxCount !== 1 ? 's' : ''})`);

      for (const ctx of contexts) {
        lines.push(`  - \`${ctx.error.code}\`: ${ctx.error.message}`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }

  private generateTestDebugFile(test: TestCase, contexts: DebugContext[]): string {
    const lines: string[] = [];

    lines.push(`# Debug: ${test.title}`);
    lines.push('');
    lines.push(`File: ${test.location.file}`);
    lines.push(`Line: ${test.location.line}`);
    lines.push('');

    for (let i = 0; i < contexts.length; i++) {
      lines.push(`## Debug Context ${i + 1}`);
      lines.push('');
      lines.push(formatContextForAI(contexts[i]));
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  private sanitizeFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }
}

export default TrellisDebugReporter;
