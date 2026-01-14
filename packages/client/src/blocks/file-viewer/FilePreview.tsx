/**
 * Trellis FilePreview - File Preview Overlay Component
 */

import React, { useCallback, useEffect } from 'react';
import type { FilePreviewProps } from './types.js';
import { styles, fileViewerTheme } from './styles.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if MIME type is previewable.
 */
function getPreviewType(mimeType: string): 'image' | 'pdf' | 'unsupported' {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return 'unsupported';
}

// =============================================================================
// ICONS
// =============================================================================

const CloseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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

const FileIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// =============================================================================
// COMPONENT
// =============================================================================

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onClose,
  onDownload,
}) => {
  const previewType = getPreviewType(file.mimeType);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle download
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(file);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [file, onDownload]);

  // Render preview content based on type
  const renderPreviewContent = () => {
    switch (previewType) {
      case 'image':
        return (
          <img
            src={file.url}
            alt={file.filename}
            style={styles['previewImage']}
            data-testid="preview-image"
          />
        );

      case 'pdf':
        return (
          <iframe
            src={file.url}
            title={file.filename}
            style={styles['previewPdf']}
            data-testid="preview-pdf"
          />
        );

      case 'unsupported':
      default:
        return (
          <div style={styles['previewUnsupported']} data-testid="preview-unsupported">
            <FileIcon size={64} />
            <p>Preview not available for this file type</p>
            <button
              type="button"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--viewer-accent, #3b82f6)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onClick={handleDownload}
            >
              <DownloadIcon />
              Download File
            </button>
          </div>
        );
    }
  };

  return (
    <div
      className="file-viewer-preview"
      style={{ ...fileViewerTheme, ...styles['previewOverlay'] }}
      onClick={handleOverlayClick}
      data-testid="preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${file.filename}`}
    >
      <div style={styles['previewContent']}>
        {/* Close button */}
        <button
          type="button"
          style={styles['closeButton']}
          onClick={onClose}
          aria-label="Close preview"
          data-testid="preview-close"
        >
          <CloseIcon size={16} />
        </button>

        {/* Header */}
        <div style={styles['previewHeader']}>
          <div style={styles['previewTitle']} title={file.filename}>
            {file.filename}
          </div>
          <div style={styles['previewActions']}>
            <button
              type="button"
              style={styles['actionButton']}
              onClick={handleDownload}
              title="Download"
              data-testid="preview-download"
            >
              <DownloadIcon />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div style={styles['previewBody']}>{renderPreviewContent()}</div>
      </div>
    </div>
  );
};

export default FilePreview;
