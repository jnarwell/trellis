/**
 * Trellis DropZone - Drag and Drop File Selection Component
 */

import React, { useRef, useState, useCallback } from 'react';
import type { DropZoneProps } from './types.js';
import { styles, fileUploaderTheme } from './styles.js';

// =============================================================================
// ICONS
// =============================================================================

const UploadIcon: React.FC<{ style?: React.CSSProperties | undefined }> = ({ style }) => (
  <svg
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

export const DropZone: React.FC<DropZoneProps> = ({
  accept,
  multiple = false,
  disabled = false,
  onFilesSelected,
  className,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
      // Reset input to allow selecting same file again
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFilesSelected]
  );

  // Handle drag enter
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      dragCounterRef.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragActive(false);
      }
    },
    [disabled]
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      e.dataTransfer.dropEffect = 'copy';
    },
    [disabled]
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setIsDragActive(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        // If multiple is false, only take the first file
        const firstFile = files[0];
        const selectedFiles = multiple ? Array.from(files) : firstFile ? [firstFile] : [];
        if (selectedFiles.length > 0) {
          onFilesSelected(selectedFiles);
        }
      }
    },
    [disabled, multiple, onFilesSelected]
  );

  // Handle keyboard activation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [disabled, handleClick]
  );

  // Build style
  const zoneStyle: React.CSSProperties = {
    ...fileUploaderTheme,
    ...styles['dropZone'],
    ...(isDragActive ? styles['dropZoneActive'] : {}),
    ...(disabled ? styles['dropZoneDisabled'] : {}),
  };

  return (
    <div
      className={`file-uploader-dropzone ${isDragActive ? 'file-uploader-dropzone--active' : ''} ${
        disabled ? 'file-uploader-dropzone--disabled' : ''
      } ${className ?? ''}`}
      style={zoneStyle}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      data-testid="dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        data-testid="file-input"
      />

      <UploadIcon style={styles['dropZoneIcon']} />

      <div style={styles['dropZoneText']}>
        {isDragActive ? (
          <span>Drop files here</span>
        ) : (
          <span>
            Drag and drop files here, or{' '}
            <span style={styles['dropZoneLink']}>browse</span>
          </span>
        )}
      </div>

      {accept && (
        <div style={styles['dropZoneHint']}>
          Accepted: {accept}
        </div>
      )}
    </div>
  );
};

export default DropZone;
