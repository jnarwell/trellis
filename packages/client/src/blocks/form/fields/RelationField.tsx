/**
 * Trellis FormBlock - RelationField Component
 *
 * Entity reference picker field.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { Entity, EntityId } from '@trellis/kernel';
import { useQuery } from '../../../state/hooks.js';
import type { BaseFieldProps } from '../types.js';

/**
 * RelationField component for selecting related entities.
 *
 * @example
 * ```tsx
 * <RelationField
 *   name="category"
 *   value={value}
 *   onChange={onChange}
 *   onBlur={onBlur}
 *   config={{
 *     property: 'category',
 *     target: 'category',
 *     display: 'name',
 *   }}
 * />
 * ```
 */
export function RelationField({
  name,
  value,
  onChange,
  onBlur,
  config,
  error,
  disabled,
  className,
}: BaseFieldProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch available entities of the target type
  const {
    data: entities,
    loading,
  } = useQuery(config.target ?? '', {
    limit: 50,
    skip: !config.target,
  });

  // Get display value for an entity
  const getDisplayValue = (entity: Entity): string => {
    if (!config.display) {
      return entity.id;
    }

    const prop = entity.properties[config.display];
    if (prop && 'value' in prop) {
      const propValue = prop.value;
      if (propValue && 'value' in propValue) {
        return String(propValue.value);
      }
    }

    return entity.id;
  };

  // Filter entities based on search
  const filteredEntities = useMemo(() => {
    if (!searchQuery) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter((entity) =>
      getDisplayValue(entity).toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);

  // Get selected entity display value
  const selectedDisplay = useMemo(() => {
    if (!value) return '';

    if (config.multiple && Array.isArray(value)) {
      const selected = entities.filter((e) => (value as string[]).includes(e.id));
      return selected.map(getDisplayValue).join(', ');
    }

    const selected = entities.find((e) => e.id === value);
    return selected ? getDisplayValue(selected) : String(value);
  }, [value, entities, config.multiple]);

  // Handle selection for single select
  const handleSelect = (entityId: EntityId) => {
    if (config.multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      if (currentValue.includes(entityId)) {
        onChange(currentValue.filter((id) => id !== entityId));
      } else {
        onChange([...currentValue, entityId]);
      }
    } else {
      onChange(entityId);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle clear
  const handleClear = () => {
    onChange(config.multiple ? [] : undefined);
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-relation-field="${name}"]`)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen, name]);

  return (
    <div
      data-relation-field={name}
      className={className}
      style={{ position: 'relative' }}
      data-testid={`field-${name}`}
    >
      {/* Input/Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <input
          type="text"
          id={name}
          name={name}
          value={isOpen ? searchQuery : selectedDisplay}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={(e) => {
            // Delay to allow click on dropdown items
            setTimeout(() => {
              onBlur();
            }, 200);
          }}
          placeholder={config.placeholder ?? 'Search...'}
          disabled={disabled || config.disabled}
          readOnly={config.readOnly}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          style={{ flex: 1 }}
        />

        {/* Clear button */}
        {Boolean(value) && !config.disabled && !config.readOnly && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selection"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '0.25rem',
            }}
          >
            &times;
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !config.disabled && !config.readOnly && (
        <div
          role="listbox"
          aria-label={`${config.label ?? name} options`}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: '#fff',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          {loading ? (
            <div style={{ padding: '0.5rem', color: '#666' }}>Loading...</div>
          ) : filteredEntities.length === 0 ? (
            <div style={{ padding: '0.5rem', color: '#666' }}>No results found</div>
          ) : (
            filteredEntities.map((entity) => {
              const isSelected = config.multiple
                ? Array.isArray(value) && value.includes(entity.id)
                : value === entity.id;

              return (
                <div
                  key={entity.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(entity.id)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = isSelected
                      ? '#bbdefb'
                      : '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.backgroundColor = isSelected
                      ? '#e3f2fd'
                      : 'transparent';
                  }}
                >
                  {config.multiple && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ marginRight: '0.5rem' }}
                    />
                  )}
                  <span>{getDisplayValue(entity)}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
