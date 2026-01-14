/**
 * Trellis FileViewerBlock - Type Definitions
 */

import type { Entity, EntityId } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for FileViewerBlock (from YAML).
 */
export interface FileViewerBlockConfig {
  /** Block type identifier */
  readonly block: 'file-viewer';

  /** Entity ID to show files for */
  readonly entityId?: EntityId;

  /** Explicit list of file URLs to display */
  readonly files?: readonly FileInfo[];

  /** Display layout mode */
  readonly layout?: 'grid' | 'list';

  /** MIME types that should show inline preview */
  readonly previewable?: readonly string[];

  /** Show download button */
  readonly showDownload?: boolean;

  /** Show delete button */
  readonly showDelete?: boolean;

  /** Action when file is clicked */
  readonly onSelect?: {
    action: 'preview' | 'download' | 'emit';
    event?: string;
  };

  /** API endpoint to fetch files (default: /api/files) */
  readonly filesEndpoint?: string;
}

// =============================================================================
// FILE INFO TYPES
// =============================================================================

/**
 * Information about a file.
 */
export interface FileInfo {
  /** File ID */
  readonly id: string;

  /** URL to access the file */
  readonly url: string;

  /** Original filename */
  readonly filename: string;

  /** File size in bytes */
  readonly size: number;

  /** MIME type */
  readonly mimeType: string;

  /** Thumbnail URL (for images) */
  readonly thumbnailUrl?: string;

  /** Upload timestamp */
  readonly createdAt?: string;

  /** Associated entity ID */
  readonly entityId?: EntityId;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for FileViewerBlock component.
 */
export interface FileViewerBlockProps {
  /** Block configuration */
  readonly config: FileViewerBlockConfig;

  /** Entity ID (may be passed as prop instead of config) */
  readonly entityId?: EntityId;

  /** Event handler callback */
  readonly onEvent?: (event: FileViewerBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for FileCard sub-component.
 */
export interface FileCardProps {
  /** File info */
  readonly file: FileInfo;

  /** Display layout */
  readonly layout: 'grid' | 'list';

  /** Whether to show preview */
  readonly previewable: boolean;

  /** Show download button */
  readonly showDownload?: boolean;

  /** Show delete button */
  readonly showDelete?: boolean;

  /** Click handler */
  readonly onClick?: (file: FileInfo) => void;

  /** Download handler */
  readonly onDownload?: (file: FileInfo) => void;

  /** Delete handler */
  readonly onDelete?: (file: FileInfo) => void;
}

/**
 * Props for FilePreview sub-component.
 */
export interface FilePreviewProps {
  /** File to preview */
  readonly file: FileInfo;

  /** Close handler */
  readonly onClose: () => void;

  /** Download handler */
  readonly onDownload?: (file: FileInfo) => void;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by FileViewerBlock.
 */
export type FileViewerBlockEvent =
  | { type: 'fileSelected'; file: FileInfo }
  | { type: 'fileDownloaded'; file: FileInfo }
  | { type: 'fileDeleted'; file: FileInfo }
  | { type: 'previewOpened'; file: FileInfo }
  | { type: 'previewClosed'; file: FileInfo }
  | { type: 'filesLoaded'; files: FileInfo[] }
  | { type: 'error'; error: Error };

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Sort options for file list.
 */
export type FileSortBy = 'name' | 'date' | 'size' | 'type';

/**
 * Sort direction.
 */
export type SortDirection = 'asc' | 'desc';
