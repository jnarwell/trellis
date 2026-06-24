/**
 * Shared formatting for measured values — `value ± uncertainty unit`
 * (e.g. `84.5 ± 0.5 g`). Used by the table cell and the detail field so a
 * measured property reads the same everywhere.
 */

import type { Entity } from '@trellis/kernel';

export interface MeasuredMeta {
  readonly uncertainty?: number;
  readonly unit?: string;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/** Format a measured quantity as `value ± uncertainty unit` (parts omitted when absent). */
export function formatMeasuredValue(value: unknown, meta: MeasuredMeta = {}): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFinite(n)) return String(value);
  const unc = meta.uncertainty !== undefined ? ` ± ${formatNumber(meta.uncertainty)}` : '';
  const unit = meta.unit ? ` ${meta.unit}` : '';
  return `${formatNumber(n)}${unc}${unit}`;
}

/**
 * Read the uncertainty/unit metadata off a raw entity property, or null when
 * the property is not a measured quantity (no uncertainty and no unit).
 */
export function measuredMetaOf(entity: Entity | undefined, property: string): MeasuredMeta | null {
  const prop = entity?.properties?.[property as keyof typeof entity.properties] as
    | { uncertainty?: number; value?: { unit?: string; uncertainty?: number } }
    | undefined;
  if (!prop) return null;
  const uncertainty = prop.uncertainty ?? prop.value?.uncertainty;
  const unit = prop.value?.unit;
  if (uncertainty === undefined && unit === undefined) return null;
  const meta: MeasuredMeta = {};
  if (uncertainty !== undefined) (meta as { uncertainty?: number }).uncertainty = uncertainty;
  if (unit !== undefined) (meta as { unit?: string }).unit = unit;
  return meta;
}
