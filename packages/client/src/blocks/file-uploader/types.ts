/**
 * Trellis FileUploaderBlock - Type Definitions
 */

import type { Entity, EntityId } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for FileUploaderBlock (from YAML).
 */
export interface FileUploaderBlockConfig {
  /** Block type identifier */
  readonly block: 'file-uploader';

  /** Entity ID to attach files to */
  readonly entityId?: EntityId;

  /** Entity type for creating new attachment entities */
  readonly entityType?: string;

  /** Accepted file types (e.g., "image/*", ".pdf,.doc") */
  readonly accept?: string;

  /** Allow multiple file uploads */
  readonly multiple?: boolean;

  /** Maximum file size in bytes */
  readonly maxSize?: number;

  /** Maximum number of files */
  readonly maxFiles?: number;

  /** Custom upload endpoint (default: /api/files) */
  readonly uploadEndpoint?: string;

  /** Action after successful upload */
  readonly onUpload?: {
    action: 'emit' | 'refresh';
    event?: string;
  };
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for FileUploaderBlock component.
 */
export interface FileUploaderBlockProps {
  /** Block configuration */
  readonly config: FileUploaderBlockConfig;

  /** Entity ID (may be passed as prop instead of config) */
  readonly entityId?: EntityId;

  /** Event handler callback */
  readonly onEvent?: (event: FileUploaderBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for DropZone sub-component.
 */
export interface DropZoneProps {
  /** Accepted file types */
  readonly accept?: string | undefined;

  /** Allow multiple files */
  readonly multiple?: boolean | undefined;

  /** Disabled state */
  readonly disabled?: boolean | undefined;

  /** Callback when files are selected */
  readonly onFilesSelected: (files: File[]) => void;

  /** Additional CSS class */
  readonly className?: string | undefined;
}

/**
 * Props for FileProgress sub-component.
 */
export interface FileProgressProps {
  /** File being uploaded */
  readonly file: FileUploadState;

  /** Callback to cancel upload */
  readonly onCancel?: ((fileId: string) => void) | undefined;

  /** Callback to retry failed upload */
  readonly onRetry?: ((fileId: string) => void) | undefined;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by FileUploaderBlock.
 */
export type FileUploaderBlockEvent =
  | { type: 'uploadStarted'; files: File[] }
  | { type: 'uploadProgress'; fileId: string; progress: number }
  | { type: 'uploadComplete'; fileId: string; result: UploadResult }
  | { type: 'uploadError'; fileId: string; error: Error }
  | { type: 'uploadCancelled'; fileId: string }
  | { type: 'allUploadsComplete'; results: UploadResult[] }
  | { type: 'validationError'; file: File; reason: string }
  | { type: 'error'; error: Error };

// =============================================================================
// STATE TYPES
// =============================================================================

/**
 * Upload status for a single file.
 */
export type UploadStatus = 'pending' | 'uploading' | 'complete' | 'error' | 'cancelled';

/**
 * State for a file being uploaded.
 */
export interface FileUploadState {
  /** Unique ID for this upload */
  readonly id: string;

  /** Original file object */
  readonly file: File;

  /** Upload progress (0-100) */
  readonly progress: number;

  /** Current status */
  readonly status: UploadStatus;

  /** Error message if failed */
  readonly error?: string;

  /** Result if complete */
  readonly result?: UploadResult;

  /** Abort controller for cancellation */
  readonly abortController?: AbortController;
}

/**
 * Result from a successful upload.
 */
export interface UploadResult {
  /** Server-assigned file ID */
  readonly id: string;

  /** URL to access the file */
  readonly url: string;

  /** Original filename */
  readonly filename: string;

  /** File size in bytes */
  readonly size: number;

  /** MIME type */
  readonly mimeType: string;

  /** Entity ID the file is attached to */
  readonly entityId?: EntityId;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation result for a file.
 */
export interface FileValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}
