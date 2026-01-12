/**
 * Trellis DetailBlock - DetailSection Component
 *
 * Displays a group of fields with a title header.
 */

import React, { useState } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import type { DetailSectionProps } from './types.js';
import { styles } from './styles.js';
import { DetailField } from './DetailField.js';

/**
 * Extract property value from entity.
 * Handles different property types (literal, inherited, computed, measured).
 */
function getPropertyValue(entity: Entity | null | undefined, property: PropertyName): unknown {
  if (!entity?.properties) return undefined;
  const prop = entity.properties[property];
  if (!prop) return undefined;

  // Handle different property sources
  switch (prop.source) {
    case 'literal':
    case 'measured':
      // Direct value access
      const directValue = prop.value;
      if (directValue && typeof directValue === 'object' && 'value' in directValue) {
        return (directValue as { value: unknown }).value;
      }
      return directValue;

    case 'inherited':
      // Use override if present, otherwise resolved_value
      const inheritedProp = prop as { override?: { value?: unknown }; resolved_value?: { value?: unknown } };
      const inheritedValue = inheritedProp.override ?? inheritedProp.resolved_value;
      if (inheritedValue && typeof inheritedValue === 'object' && 'value' in inheritedValue) {
        return inheritedValue.value;
      }
      return inheritedValue;

    case 'computed':
      // Use cached_value
      const computedProp = prop as { cached_value?: { value?: unknown } };
      const cachedValue = computedProp.cached_value;
      if (cachedValue && typeof cachedValue === 'object' && 'value' in cachedValue) {
        return cachedValue.value;
      }
      return cachedValue;

    default:
      return undefined;
  }
}

/**
 * DetailSection component displays a group of fields with header.
 */
export const DetailSection: React.FC<DetailSectionProps & { isLast?: boolean }> = ({
  config,
  entity,
  onFieldClick,
  isLast = false,
}) => {
  const {
    title,
    fields,
    collapsible = false,
    defaultCollapsed = false,
    className,
  } = config;

  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const sectionStyle: React.CSSProperties = {
    ...styles.section,
    ...(isLast ? styles.sectionLast : {}),
  };

  const headerStyle: React.CSSProperties = {
    ...styles.sectionHeader,
    ...(collapsible ? styles.sectionHeaderCollapsible : {}),
  };

  const contentStyle: React.CSSProperties = {
    ...styles.sectionContent,
    ...(collapsed ? styles.sectionCollapsed : {}),
  };

  const handleHeaderClick = collapsible
    ? () => setCollapsed(!collapsed)
    : undefined;

  return (
    <section
      className={`detail-section trellis-detail-section ${className ?? ''}`}
      style={sectionStyle}
    >
      <h3 className="detail-section-title trellis-detail-section-title" style={styles.sectionTitle}>
        {title}
      </h3>
      <div
        className="detail-section-content trellis-detail-section-content"
        style={contentStyle}
        aria-hidden={collapsed}
      >
        {fields.map((fieldConfig, index) => {
          const value = getPropertyValue(entity, fieldConfig.property);
          const isLastField = index === fields.length - 1;
          const handleClick = fieldConfig.onClick
            ? () => onFieldClick?.(fieldConfig.property)
            : undefined;

          return (
            <DetailField
              key={fieldConfig.property}
              config={fieldConfig}
              value={value}
              isLast={isLastField}
              {...(handleClick ? { onClick: handleClick } : {})}
            />
          );
        })}
      </div>
    </section>
  );
};

export default DetailSection;
