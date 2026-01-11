/**
 * @trellis/shared - Debug Formatting
 *
 * Format debug contexts for AI-assisted debugging and human readability.
 */

import type {
  DebugContext,
  EntityContext,
  ExpressionContext,
  WiringContext,
  ApiContext,
  PermissionContext,
  ValidationContext,
  StalenessContext,
  CycleContext,
  EvaluationStep,
} from './types.js';

// =============================================================================
// AI-FRIENDLY FORMAT
// =============================================================================

/**
 * Format a debug context for AI analysis.
 * Produces structured markdown that LLMs can parse and act on.
 */
export function formatForAI(ctx: DebugContext): string {
  const sections: string[] = [];

  // Header
  sections.push(`## Error: ${ctx.error.code}`);
  sections.push('');
  sections.push(`**Message:** ${ctx.error.message}`);
  sections.push('');
  sections.push(`**Operation:** ${ctx.operation}`);
  sections.push('');
  sections.push(`**Category:** ${ctx.error.category}`);
  sections.push('');

  // Entity context
  if (ctx.entity) {
    sections.push(formatEntityContext(ctx.entity));
  }

  // Expression context
  if (ctx.expression) {
    sections.push(formatExpressionContext(ctx.expression));
  }

  // Wiring context
  if (ctx.wiring) {
    sections.push(formatWiringContext(ctx.wiring));
  }

  // API context
  if (ctx.api) {
    sections.push(formatApiContext(ctx.api));
  }

  // Permission context
  if (ctx.permission) {
    sections.push(formatPermissionContext(ctx.permission));
  }

  // Validation context
  if (ctx.validation) {
    sections.push(formatValidationContext(ctx.validation));
  }

  // Staleness context
  if (ctx.staleness) {
    sections.push(formatStalenessContext(ctx.staleness));
  }

  // Cycle context
  if (ctx.cycle) {
    sections.push(formatCycleContext(ctx.cycle));
  }

  // Evaluation trace
  if (ctx.expression?.evaluationTrace && ctx.expression.evaluationTrace.length > 0) {
    sections.push(formatEvaluationTrace(ctx.expression.evaluationTrace));
  }

  // Suggestions
  if (ctx.suggestions.length > 0) {
    sections.push('### Suggestions');
    sections.push('');
    for (const suggestion of ctx.suggestions) {
      sections.push(`- ${suggestion}`);
    }
    sections.push('');
  }

  // Documentation links
  if (ctx.docs && ctx.docs.length > 0) {
    sections.push('### Relevant Docs');
    sections.push('');
    for (const doc of ctx.docs) {
      sections.push(`- [${doc}](${doc})`);
    }
    sections.push('');
  }

  // Stack trace (if available)
  if (ctx.error.stack) {
    sections.push('### Stack Trace');
    sections.push('');
    sections.push('```');
    sections.push(ctx.error.stack);
    sections.push('```');
    sections.push('');
  }

  return sections.join('\n');
}

// =============================================================================
// CONTEXT FORMATTERS
// =============================================================================

function formatEntityContext(entity: EntityContext): string {
  const lines: string[] = ['### Entity Context', ''];
  lines.push(`- **Entity Type:** ${entity.entityType}`);
  lines.push(`- **Tenant ID:** ${entity.tenantId}`);

  if (entity.entityId) {
    lines.push(`- **Entity ID:** ${entity.entityId}`);
  }

  if (entity.version !== undefined) {
    lines.push(`- **Version:** ${entity.version}`);
  }

  if (entity.expectedVersion !== undefined) {
    lines.push(`- **Expected Version:** ${entity.expectedVersion}`);
  }

  if (entity.properties) {
    lines.push('');
    lines.push('**Properties:**');
    lines.push('```json');
    lines.push(JSON.stringify(entity.properties, null, 2));
    lines.push('```');
  }

  lines.push('');
  return lines.join('\n');
}

function formatExpressionContext(expression: ExpressionContext): string {
  const lines: string[] = ['### Expression Context', ''];

  // Show the expression with position marker
  lines.push('**Expression:**');
  lines.push('```');
  lines.push(expression.source);

  if (expression.failedAt) {
    const spaces = ' '.repeat(expression.failedAt.position);
    const underline =
      expression.failedAt.endPosition !== undefined
        ? '~'.repeat(Math.max(1, expression.failedAt.endPosition - expression.failedAt.position))
        : '^';
    lines.push(spaces + underline);
  }

  lines.push('```');
  lines.push('');

  if (expression.failedAt) {
    lines.push(`**Failed at:** ${expression.failedAt.node} (position ${expression.failedAt.position})`);
    lines.push('');
  }

  // Scope
  if (Object.keys(expression.scope).length > 0) {
    lines.push('**Scope:**');
    lines.push('```json');
    lines.push(JSON.stringify(expression.scope, null, 2));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

function formatWiringContext(wiring: WiringContext): string {
  const lines: string[] = ['### Wiring Context', ''];

  lines.push(`- **From:** ${wiring.fromBlock} (${wiring.fromBlockType})`);
  lines.push(`- **Event:** ${wiring.event}`);
  lines.push(`- **To:** ${wiring.toBlock} (${wiring.toBlockType})`);
  lines.push(`- **Receiver:** ${wiring.receiver}`);
  lines.push('');

  lines.push('**Payload:**');
  lines.push('```json');
  lines.push(JSON.stringify(wiring.payload, null, 2));
  lines.push('```');
  lines.push('');

  if (wiring.transform) {
    lines.push('**Transform:**');
    lines.push('```');
    lines.push(wiring.transform.source);
    lines.push('```');
    lines.push('');

    if (wiring.transform.failedAt) {
      lines.push(`**Failed at:** \`${wiring.transform.failedAt}\``);
    }

    if (wiring.transform.error) {
      lines.push(`**Error:** ${wiring.transform.error}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatApiContext(api: ApiContext): string {
  const lines: string[] = ['### API Context', ''];

  lines.push(`- **Method:** ${api.method}`);
  lines.push(`- **Path:** ${api.path}`);

  if (api.responseStatus !== undefined) {
    lines.push(`- **Status:** ${api.responseStatus}`);
  }

  if (api.durationMs !== undefined) {
    lines.push(`- **Duration:** ${api.durationMs}ms`);
  }

  lines.push('');

  if (api.requestBody !== undefined) {
    lines.push('**Request Body:**');
    lines.push('```json');
    lines.push(JSON.stringify(api.requestBody, null, 2));
    lines.push('```');
    lines.push('');
  }

  if (api.responseBody !== undefined) {
    lines.push('**Response Body:**');
    lines.push('```json');
    lines.push(JSON.stringify(api.responseBody, null, 2));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

function formatPermissionContext(permission: PermissionContext): string {
  const lines: string[] = ['### Permission Context', ''];

  lines.push(`- **Actor ID:** ${permission.actorId}`);
  lines.push(`- **Required Permission:** ${permission.requiredPermission}`);

  if (permission.actorRoles && permission.actorRoles.length > 0) {
    lines.push(`- **Actor Roles:** ${permission.actorRoles.join(', ')}`);
  }

  if (permission.resourceId) {
    lines.push(`- **Resource ID:** ${permission.resourceId}`);
  }

  if (permission.resourceType) {
    lines.push(`- **Resource Type:** ${permission.resourceType}`);
  }

  lines.push('');
  return lines.join('\n');
}

function formatValidationContext(validation: ValidationContext): string {
  const lines: string[] = ['### Validation Context', ''];

  lines.push(`- **Path:** ${validation.path.join('.')}`);
  lines.push(`- **Expected:** ${validation.expected}`);

  if (validation.rule) {
    lines.push(`- **Rule:** ${validation.rule}`);
  }

  lines.push('');
  lines.push('**Value:**');
  lines.push('```json');
  lines.push(JSON.stringify(validation.value, null, 2));
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function formatStalenessContext(staleness: StalenessContext): string {
  const lines: string[] = ['### Staleness Context', ''];

  lines.push(`- **Trigger Property:** ${staleness.triggerProperty}`);
  lines.push(`- **Trigger Entity:** ${staleness.triggerEntityId}`);
  lines.push('');

  lines.push('**Propagation Path:**');
  for (const step of staleness.propagationPath) {
    lines.push(`  → ${step}`);
  }
  lines.push('');

  lines.push('**Affected Properties:**');
  for (const prop of staleness.affectedProperties) {
    lines.push(`  - ${prop}`);
  }
  lines.push('');

  return lines.join('\n');
}

function formatCycleContext(cycle: CycleContext): string {
  const lines: string[] = ['### Circular Dependency', ''];

  lines.push(`- **Cycle Type:** ${cycle.cycleType}`);
  lines.push('');
  lines.push('**Cycle Path:**');
  lines.push('```');
  lines.push(cycle.cyclePath.join(' -> '));
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

function formatEvaluationTrace(trace: readonly EvaluationStep[]): string {
  const lines: string[] = ['### Evaluation Trace', ''];

  for (const [i, step] of trace.entries()) {
    const status = step.error ? '✗' : '✓';
    const num = (i + 1).toString().padStart(2, ' ');

    let line = `${num}. ${status} \`${step.node}\``;

    if (step.expression) {
      line += ` \`${step.expression}\``;
    }

    if (step.output !== undefined && !step.error) {
      line += ` → ${formatValue(step.output)}`;
    }

    if (step.error) {
      line += ` → ERROR: ${step.error}`;
    }

    if (step.durationMs !== undefined) {
      line += ` (${step.durationMs}ms)`;
    }

    lines.push(line);
  }

  lines.push('');
  return lines.join('\n');
}

// =============================================================================
// CONSOLE FORMAT
// =============================================================================

/**
 * Format a debug context for console output.
 * Uses colors and formatting for terminal display.
 */
export function formatForConsole(ctx: DebugContext): string {
  const lines: string[] = [];

  // Header with color codes
  lines.push('');
  lines.push('\x1b[31m━━━ DEBUG CONTEXT ━━━\x1b[0m');
  lines.push('');
  lines.push(`\x1b[1m${ctx.error.code}\x1b[0m: ${ctx.error.message}`);
  lines.push(`Operation: ${ctx.operation}`);
  lines.push(`Timestamp: ${ctx.timestamp}`);
  lines.push('');

  // Expression with position indicator
  if (ctx.expression) {
    lines.push('\x1b[36mExpression:\x1b[0m');
    lines.push(`  ${ctx.expression.source}`);

    if (ctx.expression.failedAt) {
      const pointer = ' '.repeat(ctx.expression.failedAt.position + 2) + '\x1b[31m^\x1b[0m';
      lines.push(pointer);
    }

    lines.push('');
  }

  // Wiring
  if (ctx.wiring) {
    lines.push('\x1b[36mWiring:\x1b[0m');
    lines.push(`  ${ctx.wiring.fromBlock}.${ctx.wiring.event} → ${ctx.wiring.toBlock}.${ctx.wiring.receiver}`);
    lines.push('');
  }

  // Evaluation trace (compact)
  if (ctx.expression?.evaluationTrace && ctx.expression.evaluationTrace.length > 0) {
    lines.push('\x1b[36mTrace:\x1b[0m');

    for (const step of ctx.expression.evaluationTrace.slice(-5)) {
      const status = step.error ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
      lines.push(`  ${status} ${step.node}: ${step.expression || '-'}`);
    }

    lines.push('');
  }

  // Suggestions
  if (ctx.suggestions.length > 0) {
    lines.push('\x1b[33mSuggestions:\x1b[0m');
    for (const s of ctx.suggestions) {
      lines.push(`  • ${s}`);
    }
    lines.push('');
  }

  lines.push('\x1b[31m━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// JSON FORMAT
// =============================================================================

/**
 * Format a debug context as JSON.
 * Useful for logging and external analysis.
 */
export function formatAsJSON(ctx: DebugContext): string {
  return JSON.stringify(ctx, null, 2);
}

/**
 * Format a debug context as compact JSON (single line).
 */
export function formatAsCompactJSON(ctx: DebugContext): string {
  return JSON.stringify(ctx);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

// =============================================================================
// SUMMARY FORMAT
// =============================================================================

/**
 * Format a one-line summary of the debug context.
 */
export function formatSummary(ctx: DebugContext): string {
  let summary = `[${ctx.error.code}] ${ctx.error.message}`;

  if (ctx.expression?.failedAt) {
    summary += ` at position ${ctx.expression.failedAt.position}`;
  }

  if (ctx.wiring) {
    summary += ` (${ctx.wiring.fromBlock} → ${ctx.wiring.toBlock})`;
  }

  return summary;
}

/**
 * Format multiple contexts as a report.
 */
export function formatReport(contexts: readonly DebugContext[]): string {
  const lines: string[] = [];

  lines.push('# Debug Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Errors: ${contexts.length}`);
  lines.push('');

  // Group by operation
  const byOperation = new Map<string, DebugContext[]>();
  for (const ctx of contexts) {
    const existing = byOperation.get(ctx.operation) ?? [];
    existing.push(ctx);
    byOperation.set(ctx.operation, existing);
  }

  lines.push('## Summary by Operation');
  lines.push('');
  lines.push('| Operation | Count |');
  lines.push('|-----------|-------|');
  for (const [op, ctxs] of byOperation) {
    lines.push(`| ${op} | ${ctxs.length} |`);
  }
  lines.push('');

  // Detail for each context
  lines.push('## Error Details');
  lines.push('');

  for (const [i, ctx] of contexts.entries()) {
    lines.push(`### Error ${i + 1}`);
    lines.push('');
    lines.push(formatForAI(ctx));
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
