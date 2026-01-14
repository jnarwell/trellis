/**
 * Trellis TimelineDateGroup - Date Group Component
 *
 * Renders a group of events for a specific date.
 */

import React from 'react';
import type { TimelineDateGroupProps, TimelineItem } from './types.js';
import { TimelineEvent } from './TimelineEvent.js';
import { styles } from './styles.js';

/**
 * TimelineDateGroup displays events grouped by date.
 *
 * Visual structure:
 * ```
 * │
 * ├── January 11, 2026
 * │   │
 * │   ├─● Event 1
 * │   │    by Actor · 3:45 PM
 * │   │
 * │   ├─● Event 2
 * │   │    by Actor · 2:30 PM
 * │
 * ```
 */
export const TimelineDateGroup: React.FC<TimelineDateGroupProps> = ({
  label,
  items,
  showTimestamp,
  showActor,
  onItemClick,
}) => {
  // GUARD: Empty items
  const safeItems = items ?? [];

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <div className="timeline-block__date-group" style={styles['dateGroup']} data-testid="timeline-date-group">
      {/* Date header */}
      <div className="timeline-block__date-header" style={styles['dateGroupHeader']} data-testid="timeline-date-header">
        {label}
      </div>

      {/* Events in this group */}
      <div className="timeline-block__date-items" style={styles['dateGroupItems']}>
        {/* Vertical timeline line */}
        <div className="timeline-block__line" style={styles['timelineLine']} aria-hidden="true" />

        {safeItems.map((item) => (
          <TimelineEvent
            key={item.id}
            item={item}
            showTimestamp={showTimestamp}
            showActor={showActor}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineDateGroup;
