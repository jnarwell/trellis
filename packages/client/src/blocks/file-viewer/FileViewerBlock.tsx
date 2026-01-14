/**
 * Trellis FileViewerBlock - Main Component
 *
 * A file viewer block with grid/list layouts, previews, and download support.
 *
 * @example
 * ```tsx
 * <FileViewerBlock
 *   config={{
 *     block: 'file-viewer',
 *     entityId: 'ent_123',
 *     layout: 'grid',
 *     showDownload: true,
 *     previewable: ['image/*', 'application/pdf'],
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { EntityId } from '@trellis/kernel';
import { useEntity } from '../../state/hooks.js';
import type {
  FileViewerBlockProps,
  FileViewerBlockEvent,
  FileInfo,
} from './types.js';
import { styles, fileViewerTheme } from './styles.js';
import { FileCard } from './FileCard.js';
import { FilePreview } from './FilePreview.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if a file's MIME type matches any pattern.
 */
function matchesMimePattern(mimeType: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      // Wildcard pattern like "image/*"
      const category = pattern.slice(0, -2);
      return mimeType.startsWith(category);
    }
    return mimeType === pattern;
  });
}

// =============================================================================
// ICONS
// =============================================================================

const FolderIcon: React.FC<{ style?: React.CSSProperties | undefined }> = ({ style }) => (
  <svg
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const ViewerLoading: React.FC = () => (
  <div
    className="file-viewer-block file-viewer-block--loading"
    style={{ ...fileViewerTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="file-viewer-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading files...</span>
  </div>
);

const ViewerError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="file-viewer-block file-viewer-block--error"
    style={{ ...fileViewerTheme, ...styles['container'], ...styles['error'] }}
    data-testid="file-viewer-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

const ViewerEmpty: React.FC = () => (
  <div
    className="file-viewer-block file-viewer-block--empty"
    style={{ ...fileViewerTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="file-viewer-empty"
  >
    <FolderIcon style={styles['emptyIcon']} />
    <span>No files</span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FileViewerBlock: React.FC<FileViewerBlockProps> = ({
  config,
  entityId: propEntityId,
  onEvent,
  className,
}) => {
  // Determine entity ID from props or config
  const entityId = propEntityId ?? config.entityId;

  // Fetch entity data (optional - for getting associated files)
  const { data: entity, loading: entityLoading, error: entityError } = useEntity(
    entityId ?? null
  );

  // File state
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);

  // Configuration with defaults
  const layout = config.layout ?? 'grid';
  const showDownload = config.showDownload ?? true;
  const showDelete = config.showDelete ?? false;
  const previewableTypes = config.previewable ?? ['image/*', 'application/pdf'];

  // Emit event helper
  const emit = useCallback(
    (event: FileViewerBlockEvent) => {
      console.log('[FileViewerBlock] Event:', event.type, event);
      onEvent?.(event);
    },
    [onEvent]
  );

  // Fetch files when entityId changes
  useEffect(() => {
    // If files are explicitly provided in config, use them
    if (config.files && config.files.length > 0) {
      const fileInfos = config.files.map((f) => ({ ...f }));
      setFiles(fileInfos);
      emit({ type: 'filesLoaded', files: fileInfos });
      return;
    }

    // Otherwise fetch from API if entityId is provided
    if (!entityId) {
      setFiles([]);
      return;
    }

    const fetchFiles = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = config.filesEndpoint ?? '/api/files';
        const response = await fetch(`${endpoint}?entityId=${entityId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        const data: FileInfo[] = await response.json();
        setFiles(data);
        emit({ type: 'filesLoaded', files: data });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to load files');
        setError(errorObj);
        emit({ type: 'error', error: errorObj });
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [entityId, config.files, config.filesEndpoint, emit]);

  // Handle file click
  const handleFileClick = useCallback(
    (file: FileInfo) => {
      const action = config.onSelect?.action ?? 'preview';

      switch (action) {
        case 'preview':
          setPreviewFile(file);
          emit({ type: 'previewOpened', file });
          break;

        case 'download':
          handleDownload(file);
          break;

        case 'emit':
          emit({ type: 'fileSelected', file });
          break;
      }
    },
    [config.onSelect, emit]
  );

  // Handle file download
  const handleDownload = useCallback(
    (file: FileInfo) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      emit({ type: 'fileDownloaded', file });
    },
    [emit]
  );

  // Handle file delete
  const handleDelete = useCallback(
    async (file: FileInfo) => {
      try {
        const endpoint = config.filesEndpoint ?? '/api/files';
        const response = await fetch(`${endpoint}/${file.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete file: ${response.statusText}`);
        }

        // Remove from local state
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        emit({ type: 'fileDeleted', file });
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to delete file');
        emit({ type: 'error', error: errorObj });
      }
    },
    [config.filesEndpoint, emit]
  );

  // Handle preview close
  const handlePreviewClose = useCallback(() => {
    if (previewFile) {
      emit({ type: 'previewClosed', file: previewFile });
    }
    setPreviewFile(null);
  }, [previewFile, emit]);

  // Check if a file is previewable
  const isPreviewable = useCallback(
    (file: FileInfo): boolean => {
      return matchesMimePattern(file.mimeType, previewableTypes);
    },
    [previewableTypes]
  );

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: Loading state
  if (loading || (entityLoading && entityId)) {
    return <ViewerLoading />;
  }

  // GUARD: Error state
  if (error || entityError) {
    const errorObj = error ?? new Error(entityError?.message ?? 'Failed to load');
    return <ViewerError error={errorObj} />;
  }

  // GUARD: Empty state
  if (files.length === 0) {
    return <ViewerEmpty />;
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  const containerStyle = layout === 'grid' ? styles['grid'] : styles['list'];

  return (
    <div
      className={`file-viewer-block file-viewer-block--${layout} ${className ?? ''}`}
      style={{ ...fileViewerTheme, ...styles['container'] }}
      data-testid="file-viewer-block"
      data-entity-id={entityId}
      data-layout={layout}
    >
      {/* File grid/list */}
      <div style={containerStyle} data-testid="file-container">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            layout={layout}
            previewable={isPreviewable(file)}
            showDownload={showDownload}
            showDelete={showDelete}
            onClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Preview overlay */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={handlePreviewClose}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default FileViewerBlock;
