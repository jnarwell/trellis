/**
 * Trellis FileUploaderBlock - Main Component
 *
 * A file upload block with drag-and-drop, validation, and progress tracking.
 *
 * @example
 * ```tsx
 * <FileUploaderBlock
 *   config={{
 *     block: 'file-uploader',
 *     entityId: 'ent_123',
 *     accept: 'image/*,.pdf',
 *     multiple: true,
 *     maxSize: 10 * 1024 * 1024, // 10MB
 *   }}
 *   onEvent={(event) => console.log(event)}
 * />
 * ```
 */

import React, { useState, useCallback, useRef } from 'react';
import type { EntityId } from '@trellis/kernel';
import { useEntity } from '../../state/hooks.js';
import type {
  FileUploaderBlockProps,
  FileUploaderBlockEvent,
  FileUploadState,
  UploadResult,
  FileValidationResult,
} from './types.js';
import { styles, fileUploaderTheme } from './styles.js';
import { DropZone } from './DropZone.js';
import { FileProgress } from './FileProgress.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a unique ID for file tracking.
 */
function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validate a file against config constraints.
 */
function validateFile(
  file: File,
  config: {
    accept?: string;
    maxSize?: number;
  }
): FileValidationResult {
  // Check file size
  if (config.maxSize && file.size > config.maxSize) {
    const maxMB = (config.maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      reason: `File exceeds maximum size of ${maxMB}MB`,
    };
  }

  // Check file type
  if (config.accept) {
    const acceptedTypes = config.accept.split(',').map((t) => t.trim());
    const fileType = file.type;
    const fileName = file.name;
    const fileExtension = `.${fileName.split('.').pop()?.toLowerCase()}`;

    const isAccepted = acceptedTypes.some((accepted) => {
      // Handle wildcards like "image/*"
      if (accepted.endsWith('/*')) {
        const category = accepted.slice(0, -2);
        return fileType.startsWith(category);
      }
      // Handle extensions like ".pdf"
      if (accepted.startsWith('.')) {
        return fileExtension === accepted.toLowerCase();
      }
      // Handle MIME types
      return fileType === accepted;
    });

    if (!isAccepted) {
      return {
        valid: false,
        reason: `File type not accepted. Allowed: ${config.accept}`,
      };
    }
  }

  return { valid: true };
}

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const UploaderLoading: React.FC = () => (
  <div
    className="file-uploader-block file-uploader-block--loading"
    style={{ ...fileUploaderTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="file-uploader-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading...</span>
  </div>
);

const UploaderError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="file-uploader-block file-uploader-block--error"
    style={{ ...fileUploaderTheme, ...styles['container'], ...styles['error'] }}
    data-testid="file-uploader-error"
  >
    <span>Error: {error.message}</span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FileUploaderBlock: React.FC<FileUploaderBlockProps> = ({
  config,
  entityId: propEntityId,
  onEvent,
  className,
}) => {
  // Determine entity ID from props or config
  const entityId = propEntityId ?? config.entityId;

  // Fetch entity data (optional - for attaching files)
  const { data: entity, loading, error } = useEntity(entityId ?? null);

  // Upload state
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const completedResultsRef = useRef<UploadResult[]>([]);

  // Emit event helper
  const emit = useCallback(
    (event: FileUploaderBlockEvent) => {
      console.log('[FileUploaderBlock] Event:', event.type, event);
      onEvent?.(event);
    },
    [onEvent]
  );

  // Upload a single file
  const uploadFile = useCallback(
    async (fileState: FileUploadState): Promise<UploadResult | null> => {
      const { id, file, abortController } = fileState;
      const endpoint = config.uploadEndpoint ?? '/api/files';

      try {
        // Update to uploading status
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: 'uploading' as const, progress: 0 } : u
          )
        );

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        if (entityId) {
          formData.append('entityId', entityId);
        }

        // Perform upload with progress tracking
        // Note: Using fetch without XHR progress. For real progress, use XMLHttpRequest.
        // This is a simplified implementation.
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: abortController?.signal ?? null,
          // Note: Don't set Content-Type, browser sets it with boundary
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result: UploadResult = await response.json();

        // Update to complete
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'complete' as const, progress: 100, result }
              : u
          )
        );

        emit({ type: 'uploadComplete', fileId: id, result });
        return result;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Upload was cancelled
          setUploads((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, status: 'cancelled' as const } : u
            )
          );
          emit({ type: 'uploadCancelled', fileId: id });
          return null;
        }

        // Upload failed
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'error' as const, error: errorMessage }
              : u
          )
        );
        emit({ type: 'uploadError', fileId: id, error: new Error(errorMessage) });
        return null;
      }
    },
    [config.uploadEndpoint, entityId, emit]
  );

  // Handle files selected from drop zone
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      // Apply maxFiles limit
      const maxFiles = config.maxFiles ?? Infinity;
      const currentCount = uploads.filter(
        (u) => u.status !== 'cancelled' && u.status !== 'error'
      ).length;
      const availableSlots = maxFiles - currentCount;

      if (availableSlots <= 0) {
        emit({
          type: 'error',
          error: new Error(`Maximum of ${maxFiles} files allowed`),
        });
        return;
      }

      const filesToUpload = files.slice(0, availableSlots);

      // Validate files
      const validFiles: File[] = [];
      for (const file of filesToUpload) {
        const validationOpts: { accept?: string; maxSize?: number } = {};
        if (config.accept !== undefined) validationOpts.accept = config.accept;
        if (config.maxSize !== undefined) validationOpts.maxSize = config.maxSize;
        const validation = validateFile(file, validationOpts);

        if (!validation.valid) {
          emit({
            type: 'validationError',
            file,
            reason: validation.reason ?? 'Invalid file',
          });
        } else {
          validFiles.push(file);
        }
      }

      if (validFiles.length === 0) return;

      // Create upload states
      const newUploads: FileUploadState[] = validFiles.map((file) => ({
        id: generateFileId(),
        file,
        progress: 0,
        status: 'pending',
        abortController: new AbortController(),
      }));

      setUploads((prev) => [...prev, ...newUploads]);
      emit({ type: 'uploadStarted', files: validFiles });

      // Upload files sequentially
      completedResultsRef.current = [];
      for (const upload of newUploads) {
        const result = await uploadFile(upload);
        if (result) {
          completedResultsRef.current.push(result);
        }
      }

      // Emit all uploads complete
      if (completedResultsRef.current.length > 0) {
        emit({
          type: 'allUploadsComplete',
          results: completedResultsRef.current,
        });
      }
    },
    [config.accept, config.maxFiles, config.maxSize, uploads, uploadFile, emit]
  );

  // Handle cancel upload
  const handleCancelUpload = useCallback((fileId: string) => {
    setUploads((prev) => {
      const upload = prev.find((u) => u.id === fileId);
      if (upload?.abortController) {
        upload.abortController.abort();
      }
      return prev;
    });
  }, []);

  // Handle retry upload
  const handleRetryUpload = useCallback(
    (fileId: string) => {
      const upload = uploads.find((u) => u.id === fileId);
      if (!upload) return;

      // Reset state and retry
      const newUpload: FileUploadState = {
        id: upload.id,
        file: upload.file,
        progress: 0,
        status: 'pending',
        abortController: new AbortController(),
      };

      setUploads((prev) =>
        prev.map((u) => (u.id === fileId ? newUpload : u))
      );

      uploadFile(newUpload);
    },
    [uploads, uploadFile]
  );

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: Loading state (only if we're fetching entity data)
  if (loading && entityId) {
    return <UploaderLoading />;
  }

  // GUARD: Error state
  if (error) {
    return <UploaderError error={new Error(error.message ?? 'Failed to load')} />;
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  // Determine if we can accept more files
  const maxFiles = config.maxFiles ?? Infinity;
  const activeUploads = uploads.filter(
    (u) => u.status !== 'cancelled' && u.status !== 'error'
  );
  const canUploadMore = activeUploads.length < maxFiles;
  const isUploading = uploads.some((u) => u.status === 'uploading');

  return (
    <div
      className={`file-uploader-block ${className ?? ''}`}
      style={{ ...fileUploaderTheme, ...styles['container'] }}
      data-testid="file-uploader-block"
      data-entity-id={entityId}
    >
      {/* Drop zone */}
      <DropZone
        accept={config.accept}
        multiple={config.multiple}
        disabled={!canUploadMore || isUploading}
        onFilesSelected={handleFilesSelected}
      />

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div style={styles['fileList']} data-testid="file-list">
          {uploads.map((upload) => (
            <FileProgress
              key={upload.id}
              file={upload}
              onCancel={handleCancelUpload}
              onRetry={handleRetryUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploaderBlock;
