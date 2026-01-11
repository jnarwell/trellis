/**
 * Trellis DetailBlock - DetailActions Component
 *
 * Displays action buttons for the detail view.
 */

import React from 'react';
import type { DetailActionsProps, DetailActionConfig } from './types.js';
import { styles } from './styles.js';

/**
 * Get button style based on variant.
 */
function getButtonStyle(
  variant: DetailActionConfig['variant'] = 'secondary',
  disabled: boolean
): React.CSSProperties {
  const baseStyle = { ...styles.actionButton };

  switch (variant) {
    case 'primary':
      Object.assign(baseStyle, styles.actionPrimary);
      break;
    case 'danger':
      Object.assign(baseStyle, styles.actionDanger);
      break;
    case 'secondary':
    default:
      Object.assign(baseStyle, styles.actionSecondary);
      break;
  }

  if (disabled) {
    Object.assign(baseStyle, styles.actionDisabled);
  }

  return baseStyle;
}

/**
 * DetailActions component displays action buttons.
 */
export const DetailActions: React.FC<DetailActionsProps> = ({
  actions,
  entity,
  onAction,
}) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  const handleClick = (action: DetailActionConfig) => {
    if (action.confirm) {
      const message =
        action.confirmMessage ?? `Are you sure you want to ${action.label.toLowerCase()}?`;
      if (!window.confirm(message)) {
        return;
      }
    }
    onAction(action);
  };

  return (
    <div className="trellis-detail-actions" style={styles.actions}>
      {actions.map((action, index) => {
        // For now, disabled is not evaluated - just check if it's truthy
        const isDisabled = Boolean(action.disabled);
        const buttonStyle = getButtonStyle(action.variant, isDisabled);

        return (
          <button
            key={action.event ?? index}
            type="button"
            className={`trellis-detail-action ${action.className ?? ''}`}
            style={buttonStyle}
            disabled={isDisabled}
            onClick={() => handleClick(action)}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default DetailActions;
