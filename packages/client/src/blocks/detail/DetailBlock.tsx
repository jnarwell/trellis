/**
 * Trellis DetailBlock - Main Component
 *
 * Displays a single entity with configurable sections and actions.
 */

import React, { useEffect, useCallback } from 'react';
import type { Entity, PropertyName } from '@trellis/kernel';
import { useEntity, useDeleteEntity } from '../../state/hooks.js';
import { useNavigation } from '../../runtime/NavigationProvider.js';
import type { DetailBlockProps, DetailActionConfig, DetailBlockEvent } from './types.js';
import { styles, detailTheme } from './styles.js';
import { DetailSection } from './DetailSection.js';
import { DetailActions } from './DetailActions.js';

/**
 * Extract property value from entity.
 */
function getPropertyValue(entity: Entity, property: PropertyName): unknown {
  const prop = entity.properties[property];
  if (!prop) return undefined;

  switch (prop.source) {
    case 'literal':
    case 'measured':
      const directValue = prop.value;
      if (directValue && typeof directValue === 'object' && 'value' in directValue) {
        return (directValue as { value: unknown }).value;
      }
      return directValue;

    case 'inherited':
      const inheritedProp = prop as { override?: { value?: unknown }; resolved_value?: { value?: unknown } };
      const inheritedValue = inheritedProp.override ?? inheritedProp.resolved_value;
      if (inheritedValue && typeof inheritedValue === 'object' && 'value' in inheritedValue) {
        return inheritedValue.value;
      }
      return inheritedValue;

    case 'computed':
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
 * Simple template evaluator for action targets.
 * Supports ${$entity.property} and $entity.property syntax.
 */
function evaluateActionTarget(template: string, entity: Entity): string {
  return template.replace(/\$\{?\$?entity\.(\w+)\}?/g, (_, property) => {
    if (property === 'id') return entity.id;
    if (property === 'type') return entity.type;
    const value = getPropertyValue(entity, property as PropertyName);
    return value !== undefined && value !== null ? String(value) : '';
  });
}

/**
 * Loading skeleton component.
 */
const DetailSkeleton: React.FC = () => (
  <div className="trellis-detail-loading" style={styles.loading}>
    <div style={styles.loadingSpinner} />
    <span>Loading...</span>
  </div>
);

/**
 * Not found component.
 */
const DetailNotFound: React.FC = () => (
  <div className="trellis-detail-not-found" style={styles.notFound as React.CSSProperties}>
    <span style={styles.notFoundIcon}>?</span>
    <p>Entity not found</p>
  </div>
);

/**
 * Error component.
 */
const DetailError: React.FC<{ error: Error }> = ({ error }) => (
  <div className="trellis-detail-error" style={styles.error}>
    <span>Error: {error.message}</span>
  </div>
);

/**
 * DetailBlock displays a single entity with sections and actions.
 *
 * @example
 * ```tsx
 * <DetailBlock
 *   entityId="ent_abc123"
 *   sections={[
 *     {
 *       title: "Basic Info",
 *       fields: [
 *         { property: "name", label: "Name" },
 *         { property: "description" },
 *         { property: "price", format: "currency" },
 *       ],
 *     },
 *   ]}
 *   actions={[
 *     { label: "Edit", event: "navigate", target: "/edit/${$entity.id}" },
 *     { label: "Delete", event: "delete", confirm: true, variant: "danger" },
 *   ]}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */
export const DetailBlock: React.FC<DetailBlockProps> = ({
  entityId,
  source,
  sections,
  actions,
  onEvent,
  className,
}) => {
  const { data: entity, loading, error } = useEntity(entityId);
  const { mutate: deleteEntity } = useDeleteEntity();
  const { push, back } = useNavigation();

  // Emit entityLoaded event when data arrives
  useEffect(() => {
    if (entity && onEvent) {
      onEvent({ type: 'entityLoaded', entity });
    }
  }, [entity, onEvent]);

  // Emit error event
  useEffect(() => {
    if (error && onEvent) {
      onEvent({ type: 'error', error: new Error(error.message ?? 'Unknown error') });
    }
  }, [error, onEvent]);

  // Handle field click
  const handleFieldClick = (property: PropertyName) => {
    if (!entity || !onEvent) return;
    onEvent({ type: 'fieldClicked', property, entity });
  };

  // Handle action click
  const handleAction = useCallback(
    async (action: DetailActionConfig) => {
      if (!entity) return;

      // Handle navigate action with target template
      if (action.event === 'navigate' && action.target) {
        try {
          const target = evaluateActionTarget(action.target, entity);
          push(target);
          onEvent?.({ type: 'navigate', target, entity });
        } catch (err) {
          console.error('Failed to evaluate action target:', err);
        }
        return;
      }

      // Handle delete action - actually delete the entity
      if (action.event === 'delete') {
        try {
          await deleteEntity(entity.id);
          onEvent?.({ type: 'delete', entity });
          // Navigate back after successful deletion
          back();
        } catch (err) {
          console.error('Failed to delete entity:', err);
          onEvent?.({ type: 'error', error: err as Error });
        }
        return;
      }

      // Generic action
      onEvent?.({ type: 'actionClicked', action: action.event, entity });
    },
    [entity, onEvent, deleteEntity, push, back]
  );

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return <DetailSkeleton />;
    }

    if (error) {
      return <DetailError error={new Error(error.message ?? 'Failed to load entity')} />;
    }

    if (!entity) {
      return <DetailNotFound />;
    }

    return (
      <>
        {sections.map((sectionConfig, index) => (
          <DetailSection
            key={sectionConfig.title}
            config={sectionConfig}
            entity={entity}
            onFieldClick={handleFieldClick}
            isLast={index === sections.length - 1 && (!actions || actions.length === 0)}
          />
        ))}
        {actions && actions.length > 0 && (
          <DetailActions actions={actions} entity={entity} onAction={handleAction} />
        )}
      </>
    );
  };

  return (
    <div
      className={`detail-block trellis-detail ${className ?? ''}`}
      style={{ ...detailTheme, ...styles.container }}
      data-entity-id={entityId}
      data-entity-type={source}
    >
      {renderContent()}
    </div>
  );
};

export default DetailBlock;
