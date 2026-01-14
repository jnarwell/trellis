/**
 * Trellis FileProgress - Upload Progress Display Component
 */

import React from 'react';
import type { FileProgressProps } from './types.js';
import { styles, fileUploaderTheme } from './styles.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get file extension for icon display.
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '?';
  const ext = parts[parts.length - 1];
  return ext ? ext.slice(0, 4) : '?';
}

// =============================================================================
// ICONS
// =============================================================================

const CheckIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

export const FileProgress: React.FC<FileProgressProps> = ({
  file,
  onCancel,
  onRetry,
}) => {
  const { id, file: fileObj, progress, status, error } = file;

  // Determine item style based on status
  const getItemStyle = (): React.CSSProperties => {
    const baseStyle = { ...fileUploaderTheme, ...styles['fileItem'] };
    switch (status) {
      case 'error':
        return { ...baseStyle, ...styles['fileItemError'] };
      case 'complete':
        return { ...baseStyle, ...styles['fileItemComplete'] };
      default:
        return baseStyle;
    }
  };

  // Render status indicator
  const renderStatus = () => {
    switch (status) {
      case 'pending':
        return (
          <span style={styles['fileStatus']}>
            Waiting...
          </span>
        );
      case 'uploading':
        return (
          <span style={styles['fileStatus']}>
            {progress}%
          </span>
        );
      case 'complete':
        return (
          <span style={{ ...styles['fileStatus'], ...styles['fileStatusSuccess'] }}>
            <CheckIcon /> Complete
          </span>
        );
      case 'error':
        return (
          <span style={{ ...styles['fileStatus'], ...styles['fileStatusError'] }}>
            <AlertIcon /> {error ?? 'Failed'}
          </span>
        );
      case 'cancelled':
        return (
          <span style={styles['fileStatus']}>
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Render actions based on status
  const renderActions = () => {
    switch (status) {
      case 'uploading':
        return onCancel ? (
          <button
            type="button"
            style={{ ...styles['actionButton'], ...styles['actionButtonDanger'] }}
            onClick={() => onCancel(id)}
            data-testid={`cancel-${id}`}
          >
            Cancel
          </button>
        ) : null;
      case 'error':
        return onRetry ? (
          <button
            type="button"
            style={styles['actionButton']}
            onClick={() => onRetry(id)}
            data-testid={`retry-${id}`}
          >
            Retry
          </button>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div
      className={`file-uploader-item file-uploader-item--${status}`}
      style={getItemStyle()}
      data-testid={`file-item-${id}`}
    >
      {/* File type icon */}
      <div style={styles['fileIcon']}>
        {getFileExtension(fileObj.name)}
      </div>

      {/* File info */}
      <div style={styles['fileInfo']}>
        <div style={styles['fileName']} title={fileObj.name}>
          {fileObj.name}
        </div>
        <div style={styles['fileSize']}>
          {formatFileSize(fileObj.size)}
        </div>

        {/* Progress bar (only during upload) */}
        {status === 'uploading' && (
          <div style={styles['progressBar']}>
            <div
              style={{
                ...styles['progressFill'],
                width: `${progress}%`,
              }}
              data-testid={`progress-${id}`}
            />
          </div>
        )}
      </div>

      {/* Status */}
      {renderStatus()}

      {/* Actions */}
      <div style={styles['fileActions']}>
        {renderActions()}
      </div>
    </div>
  );
};

export default FileProgress;
