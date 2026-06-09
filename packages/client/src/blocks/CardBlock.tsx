/**
 * Trellis CardBlock
 *
 * A container block that renders nested blocks within a card UI.
 */

import React, { Suspense } from 'react';
import { useBlockContext } from './BlockProvider.js';

// Lazy import BlockRenderer to avoid circular dependency
const LazyBlockRenderer = React.lazy(() =>
  import('./BlockRenderer.js').then((m) => ({ default: m.SafeBlockRenderer }))
);

/**
 * Props for CardBlock.
 */
export interface CardBlockProps {
  config: {
    title?: string;
    padding?: string;
    children?: readonly {
      type: string;
      id?: string;
      props?: Record<string, unknown>;
    }[];
    [key: string]: unknown;
  };
  className?: string;
}

/**
 * Loading placeholder for nested blocks.
 */
function BlockLoading(): React.ReactElement {
  return (
    <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
      Loading...
    </div>
  );
}

/**
 * CardBlock renders a card container with optional nested blocks.
 */
export function CardBlock({ config, className }: CardBlockProps): React.ReactElement {
  const { wiring, scope } = useBlockContext();
  const title = config.title;
  const padding = config.padding;
  // Support both 'children' and 'blocks' as property names
  const blocks = (config as { blocks?: typeof config.children }).blocks;
  const children = config.children ?? blocks ?? [];

  return (
    <div
      className={className}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: '#374151',
            backgroundColor: '#f9fafb',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ padding: padding === 'none' ? 0 : '1rem' }}>
        {children.length > 0 ? (
          <Suspense fallback={<BlockLoading />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {children.map((child, index) => {
                // Build BlockConfig from child
                const blockConfig = {
                  block: child.type,
                  id: child.id,
                  ...child.props,
                };

                return (
                  <LazyBlockRenderer
                    key={child.id ?? `child-${index}`}
                    config={blockConfig}
                    wiring={wiring}
                    scope={scope}
                  />
                );
              })}
            </div>
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
