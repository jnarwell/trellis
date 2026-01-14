/**
 * Trellis TimelineEvent - Individual Event Component
 *
 * Renders a single event in the timeline.
 */

import React, { useCallback } from 'react';
import type { TimelineEventProps } from './types.js';
import { styles, getDotStyle } from './styles.js';

/**
 * Format time for display.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
function relativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d ago`;

  return formatTime(date);
}

/**
 * TimelineEvent displays a single event in the timeline.
 */
export const TimelineEvent: React.FC<TimelineEventProps> = ({
  item,
  showTimestamp,
  showActor,
  onClick,
}) => {
  // GUARD: Null item
  if (!item) {
    return null;
  }

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(item);
    }
  }, [item, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onClick) {
          onClick(item);
        }
      }
    },
    [item, onClick]
  );

  // Extract values with safe fallbacks
  const title = item.title ?? 'Untitled event';
  const description = item.description;
  const actor = item.actor;
  const timestamp = item.timestamp;
  const eventType = item.eventType;

  // Determine if we should show meta row
  const showMeta = (showTimestamp && timestamp) || (showActor && actor);

  return (
    <div
      className="timeline-block__event"
      style={styles['eventItem']}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-testid="timeline-event"
      data-event-type={eventType}
    >
      {/* Timeline dot */}
      <div
        className="timeline-block__event-dot"
        style={getDotStyle(eventType)}
        data-testid="timeline-event-dot"
      />

      {/* Event content */}
      <div className="timeline-block__event-content" style={styles['eventContent']}>
        {/* Title */}
        <p className="timeline-block__event-title" style={styles['eventTitle']}>
          {title}
        </p>

        {/* Description (optional) */}
        {description && (
          <p className="timeline-block__event-description" style={styles['eventDescription']}>
            {description}
          </p>
        )}

        {/* Meta row: actor and timestamp */}
        {showMeta && (
          <div className="timeline-block__event-meta" style={styles['eventMeta']}>
            {showActor && actor && (
              <span className="timeline-block__event-actor" style={styles['eventActor']}>
                by {actor}
              </span>
            )}
            {showActor && actor && showTimestamp && timestamp && (
              <span style={styles['metaSeparator']}>·</span>
            )}
            {showTimestamp && timestamp && (
              <span
                className="timeline-block__event-timestamp"
                style={styles['eventTimestamp']}
                title={timestamp.toLocaleString()}
              >
                {formatTime(timestamp)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineEvent;
