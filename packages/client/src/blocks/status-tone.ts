/**
 * Semantic status tones.
 *
 * Maps common status / stage / priority values to a visual tone so tables and
 * boards colour them consistently across every product — with no per-product
 * configuration. Unknown values fall back to neutral.
 */

export type StatusTone = 'positive' | 'progress' | 'warning' | 'danger' | 'neutral';

/** Column property names that should render as status badges by default. */
export const STATUS_LIKE_PROPERTIES = new Set([
  'status',
  'priority',
  'stage',
  'lifecycle',
  'type',
  'channel',
  'severity',
]);

const TONE_MAP: Record<string, StatusTone> = {
  // positive (green) — terminal / good states
  done: 'positive',
  won: 'positive',
  released: 'positive',
  hired: 'positive',
  resolved: 'positive',
  in_stock: 'positive',
  active: 'positive',
  approved: 'positive',
  complete: 'positive',
  completed: 'positive',

  // progress (blue) — work underway
  in_progress: 'progress',
  in_review: 'progress',
  review: 'progress',
  proposal: 'progress',
  qualified: 'progress',
  interview: 'progress',
  screening: 'progress',
  pending: 'progress',
  normal: 'progress',

  // warning (amber) — needs attention / mid-pipeline
  offer: 'warning',
  low_stock: 'warning',
  on_order: 'warning',
  open: 'warning',
  medium: 'warning',

  // danger (red) — bad / urgent / terminal-negative
  lost: 'danger',
  rejected: 'danger',
  obsolete: 'danger',
  out_of_stock: 'danger',
  urgent: 'danger',
  high: 'danger',
  blocked: 'danger',
  critical: 'danger',

  // neutral (gray) — start / inactive states
  todo: 'neutral',
  backlog: 'neutral',
  applied: 'neutral',
  design: 'neutral',
  lead: 'neutral',
  draft: 'neutral',
  closed: 'neutral',
  low: 'neutral',
};

/** Resolve a value to a tone. */
export function statusTone(value: unknown): StatusTone {
  const key = String(value ?? '').toLowerCase().trim();
  return TONE_MAP[key] ?? 'neutral';
}

/** Human-friendly label: underscores → spaces (CSS capitalizes). */
export function statusLabel(value: unknown): string {
  return String(value ?? '').replace(/_/g, ' ');
}
