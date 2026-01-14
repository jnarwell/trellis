/**
 * Trellis ModalBlock - Main Component
 *
 * A container block that displays content in an overlay dialog.
 * Supports trigger buttons, keyboard interaction, and action buttons.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOptionalBlockContext } from '../BlockProvider.js';
import { BlockRenderer } from '../BlockRenderer.js';
import type { ModalBlockProps, ModalBlockEvent, ModalAction } from './types.js';
import { styles, modalTheme } from './styles.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get button style based on variant and hover state.
 */
function getButtonStyle(
  variant: 'primary' | 'secondary' | 'danger' | undefined,
  isHovered: boolean
): React.CSSProperties {
  let style = { ...styles['button'] };

  switch (variant) {
    case 'danger':
      style = { ...style, ...styles['buttonDanger'] };
      if (isHovered) style = { ...style, ...styles['buttonDangerHover'] };
      break;
    case 'secondary':
      style = { ...style, ...styles['buttonSecondary'] };
      if (isHovered) style = { ...style, ...styles['buttonSecondaryHover'] };
      break;
    case 'primary':
    default:
      style = { ...style, ...styles['buttonPrimary'] };
      if (isHovered) style = { ...style, ...styles['buttonPrimaryHover'] };
      break;
  }

  return style;
}

// =============================================================================
// ACTION BUTTON COMPONENT
// =============================================================================

interface ActionButtonProps {
  action: ModalAction;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      style={getButtonStyle(action.variant, isHovered)}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`modal-action-${action.action}`}
    >
      {action.label}
    </button>
  );
};

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const ModalError: React.FC<{ error: Error }> = ({ error }) => (
  <div style={styles['error']} data-testid="modal-error">
    <span>Error: {error.message}</span>
  </div>
);

// =============================================================================
// MODAL DIALOG COMPONENT
// =============================================================================

interface ModalDialogProps {
  config: ModalBlockProps['config'];
  onClose: (reason: 'button' | 'overlay' | 'escape' | 'action') => void;
  onAction: (action: ModalAction) => void;
  children: React.ReactNode;
}

const ModalDialog: React.FC<ModalDialogProps> = ({
  config,
  onClose,
  onAction,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [closeHovered, setCloseHovered] = useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && config.closable !== false) {
        onClose('escape');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.closable, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Focus trap - focus the dialog when it opens
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && config.closeOnOverlay !== false) {
        onClose('overlay');
      }
    },
    [config.closeOnOverlay, onClose]
  );

  // Prevent clicks inside dialog from closing
  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Get dialog size style
  const getSizeStyle = (): React.CSSProperties => {
    switch (config.size) {
      case 'small':
        return styles['dialogSmall'] ?? {};
      case 'large':
        return styles['dialogLarge'] ?? {};
      case 'fullscreen':
        return styles['dialogFullscreen'] ?? {};
      case 'medium':
      default:
        return styles['dialogMedium'] ?? {};
    }
  };

  const dialogStyle: React.CSSProperties = {
    ...modalTheme,
    ...styles['dialog'],
    ...getSizeStyle(),
  };

  const closeButtonStyle: React.CSSProperties = {
    ...styles['closeButton'],
    ...(closeHovered ? styles['closeButtonHover'] : {}),
  };

  return (
    <div
      style={styles['overlay']}
      onClick={handleOverlayClick}
      data-testid="modal-overlay"
      role="presentation"
    >
      <div
        ref={dialogRef}
        style={dialogStyle}
        onClick={handleDialogClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={config.title ? 'modal-title' : undefined}
        tabIndex={-1}
        data-testid="modal-dialog"
      >
        {/* Header */}
        {(config.title || config.closable !== false) && (
          <div style={styles['header']}>
            {config.title && (
              <h2 id="modal-title" style={styles['title']}>
                {config.title}
              </h2>
            )}
            {config.closable !== false && (
              <button
                type="button"
                style={closeButtonStyle}
                onClick={() => onClose('button')}
                onMouseEnter={() => setCloseHovered(true)}
                onMouseLeave={() => setCloseHovered(false)}
                aria-label="Close modal"
                data-testid="modal-close"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={styles['body']}>
          <div style={styles['bodyContent']}>{children}</div>
        </div>

        {/* Footer with actions */}
        {(config.actions ?? []).length > 0 && (
          <div style={styles['footer']} data-testid="modal-footer">
            {(config.actions ?? []).map((action, index) => (
              <ActionButton
                key={`action-${index}`}
                action={action}
                onClick={() => onAction(action)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ModalBlock: React.FC<ModalBlockProps> = ({
  config,
  entityId,
  onEvent,
  className,
}) => {
  // Get block context for rendering child blocks
  const blockContext = useOptionalBlockContext();

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);

  // GUARD: Config must have blocks array
  const blocks = config.blocks ?? [];

  // Handle open
  const handleOpen = useCallback(() => {
    console.log('[ModalBlock] Opening modal');
    setIsOpen(true);
    onEvent?.({ type: 'opened' });
  }, [onEvent]);

  // Handle close
  const handleClose = useCallback(
    (reason: 'button' | 'overlay' | 'escape' | 'action') => {
      console.log('[ModalBlock] Closing modal:', reason);
      setIsOpen(false);
      onEvent?.({ type: 'closed', reason });
    },
    [onEvent]
  );

  // Handle action button click
  const handleAction = useCallback(
    (action: ModalAction) => {
      console.log('[ModalBlock] Action clicked:', action);

      switch (action.action) {
        case 'close':
          handleClose('action');
          break;
        case 'submit':
          onEvent?.({ type: 'submit' });
          handleClose('action');
          break;
        case 'emit':
          if (action.event) {
            onEvent?.({ type: 'custom', event: action.event });
          }
          handleClose('action');
          break;
      }
    },
    [handleClose, onEvent]
  );

  // Listen for trigger events
  useEffect(() => {
    if (config.trigger === 'event' && config.triggerEvent && blockContext) {
      // Subscribe to the trigger event through wiring
      const handler = () => {
        handleOpen();
      };

      // For now, just log that we would subscribe
      console.log('[ModalBlock] Would subscribe to event:', config.triggerEvent);

      // Note: Actual event subscription would go through the wiring system
      // This is a placeholder for event-triggered modals
    }
  }, [config.trigger, config.triggerEvent, blockContext, handleOpen]);

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: No block context (can't render child blocks)
  if (!blockContext) {
    return <ModalError error={new Error('ModalBlock must be used within a BlockProvider')} />;
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  const triggerStyle: React.CSSProperties = {
    ...styles['trigger'],
    ...(triggerHovered ? styles['triggerHover'] : {}),
  };

  // Render modal using portal
  const modal = isOpen
    ? createPortal(
        <ModalDialog config={config} onClose={handleClose} onAction={handleAction}>
          {blocks.map((block, index) => (
            <BlockRenderer
              key={block.id ?? `block-${index}`}
              config={block}
              wiring={blockContext.wiring}
              scope={blockContext.scope}
            />
          ))}
        </ModalDialog>,
        document.body
      )
    : null;

  return (
    <div
      className={`modal-block ${className ?? ''}`}
      data-testid="modal-block"
    >
      {/* Trigger button */}
      {config.trigger === 'button' && (
        <button
          type="button"
          style={triggerStyle}
          onClick={handleOpen}
          onMouseEnter={() => setTriggerHovered(true)}
          onMouseLeave={() => setTriggerHovered(false)}
          data-testid="modal-trigger"
        >
          {config.triggerLabel ?? 'Open'}
        </button>
      )}

      {/* Portal modal */}
      {modal}
    </div>
  );
};

export default ModalBlock;
