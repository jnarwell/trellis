/**
 * Trellis FileCard - File Display Card Component
 */

import React, { useState, useCallback } from 'react';
import type { FileCardProps } from './types.js';
import { styles, fileViewerTheme } from './styles.js';

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

/**
 * Check if a file is an image.
 */
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// =============================================================================
// ICONS
// =============================================================================

const DownloadIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// =============================================================================
// GRID CARD COMPONENT
// =============================================================================

const GridCard: React.FC<FileCardProps> = ({
  file,
  previewable,
  showDownload,
  showDelete,
  onClick,
  onDownload,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onClick?.(file);
  }, [file, onClick]);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload?.(file);
    },
    [file, onDownload]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(file);
    },
    [file, onDelete]
  );

  const cardStyle: React.CSSProperties = {
    ...fileViewerTheme,
    ...styles['cardGrid'],
    ...(isHovered ? styles['cardGridHover'] : {}),
  };

  const showThumbnail = isImage(file.mimeType) && (file.thumbnailUrl || file.url);

  return (
    <div
      className="file-viewer-card file-viewer-card--grid"
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`file-card-${file.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Thumbnail or placeholder */}
      {showThumbnail ? (
        <img
          src={file.thumbnailUrl || file.url}
          alt={file.filename}
          style={styles['cardThumbnail']}
          loading="lazy"
        />
      ) : (
        <div style={styles['cardThumbnailPlaceholder']}>
          {getFileExtension(file.filename)}
        </div>
      )}

      {/* File info */}
      <div style={styles['cardInfo']}>
        <div style={styles['cardName']} title={file.filename}>
          {file.filename}
        </div>
        <div style={styles['cardMeta']}>{formatFileSize(file.size)}</div>
      </div>

      {/* Actions (show on hover) */}
      {isHovered && (showDownload || showDelete) && (
        <div style={{ ...styles['cardActions'], padding: '0.5rem' }}>
          {showDownload && (
            <button
              type="button"
              style={styles['actionButton']}
              onClick={handleDownload}
              title="Download"
              data-testid={`download-${file.id}`}
            >
              <DownloadIcon />
            </button>
          )}
          {showDelete && (
            <button
              type="button"
              style={{ ...styles['actionButton'], ...styles['actionButtonDanger'] }}
              onClick={handleDelete}
              title="Delete"
              data-testid={`delete-${file.id}`}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LIST CARD COMPONENT
// =============================================================================

const ListCard: React.FC<FileCardProps> = ({
  file,
  previewable,
  showDownload,
  showDelete,
  onClick,
  onDownload,
  onDelete,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onClick?.(file);
  }, [file, onClick]);

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDownload?.(file);
    },
    [file, onDownload]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(file);
    },
    [file, onDelete]
  );

  const cardStyle: React.CSSProperties = {
    ...fileViewerTheme,
    ...styles['cardList'],
    ...(isHovered ? styles['cardListHover'] : {}),
  };

  return (
    <div
      className="file-viewer-card file-viewer-card--list"
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`file-card-${file.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* File type icon */}
      <div style={styles['cardListIcon']}>{getFileExtension(file.filename)}</div>

      {/* File info */}
      <div style={styles['cardListInfo']}>
        <div style={styles['cardListName']} title={file.filename}>
          {file.filename}
        </div>
        <div style={styles['cardListMeta']}>
          <span>{formatFileSize(file.size)}</span>
          <span>{file.mimeType}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={styles['cardActions']}>
        {showDownload && (
          <button
            type="button"
            style={styles['actionButton']}
            onClick={handleDownload}
            title="Download"
            data-testid={`download-${file.id}`}
          >
            <DownloadIcon />
          </button>
        )}
        {showDelete && (
          <button
            type="button"
            style={{ ...styles['actionButton'], ...styles['actionButtonDanger'] }}
            onClick={handleDelete}
            title="Delete"
            data-testid={`delete-${file.id}`}
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FileCard: React.FC<FileCardProps> = (props) => {
  if (props.layout === 'list') {
    return <ListCard {...props} />;
  }
  return <GridCard {...props} />;
};

export default FileCard;
