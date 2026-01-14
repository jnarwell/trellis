/**
 * Trellis ModalBlock - Styles
 *
 * CSS-in-JS styles for the modal container block.
 */

import type React from 'react';

// =============================================================================
// THEME VARIABLES
// =============================================================================

/**
 * CSS custom properties for theming.
 */
export const modalTheme: React.CSSProperties = {
  '--modal-bg': '#ffffff',
  '--modal-overlay': 'rgba(0, 0, 0, 0.5)',
  '--modal-border': '#e5e7eb',
  '--modal-text': '#111827',
  '--modal-text-muted': '#6b7280',
  '--modal-accent': '#3b82f6',
  '--modal-danger': '#ef4444',
  '--modal-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as React.CSSProperties;

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const styles: Record<string, React.CSSProperties> = {
  // Trigger button
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: 'var(--modal-accent, #3b82f6)',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },

  triggerHover: {
    backgroundColor: '#2563eb',
  },

  // Overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--modal-overlay, rgba(0, 0, 0, 0.5))',
    zIndex: 1000,
    padding: '1rem',
  },

  // Dialog container
  dialog: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--modal-bg, #ffffff)',
    borderRadius: '0.5rem',
    boxShadow: 'var(--modal-shadow, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
    maxHeight: 'calc(100vh - 2rem)',
    overflow: 'hidden',
  },

  // Size variants
  dialogSmall: {
    width: '100%',
    maxWidth: '400px',
  },

  dialogMedium: {
    width: '100%',
    maxWidth: '600px',
  },

  dialogLarge: {
    width: '100%',
    maxWidth: '900px',
  },

  dialogFullscreen: {
    width: 'calc(100vw - 2rem)',
    height: 'calc(100vh - 2rem)',
    maxWidth: 'none',
    maxHeight: 'none',
    borderRadius: '0.25rem',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--modal-border, #e5e7eb)',
    flexShrink: 0,
  },

  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--modal-text, #111827)',
    margin: 0,
  },

  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    padding: 0,
    fontSize: '1.5rem',
    lineHeight: 1,
    color: 'var(--modal-text-muted, #6b7280)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
  },

  closeButtonHover: {
    backgroundColor: '#f3f4f6',
    color: 'var(--modal-text, #111827)',
  },

  // Body
  body: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
  },

  bodyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--modal-border, #e5e7eb)',
    flexShrink: 0,
  },

  // Action buttons
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '0.375rem',
    cursor: 'pointer',
    border: 'none',
    transition: 'background-color 0.15s',
  },

  buttonPrimary: {
    backgroundColor: 'var(--modal-accent, #3b82f6)',
    color: '#ffffff',
  },

  buttonPrimaryHover: {
    backgroundColor: '#2563eb',
  },

  buttonSecondary: {
    backgroundColor: '#f3f4f6',
    color: 'var(--modal-text, #111827)',
    border: '1px solid var(--modal-border, #e5e7eb)',
  },

  buttonSecondaryHover: {
    backgroundColor: '#e5e7eb',
  },

  buttonDanger: {
    backgroundColor: 'var(--modal-danger, #ef4444)',
    color: '#ffffff',
  },

  buttonDangerHover: {
    backgroundColor: '#dc2626',
  },

  // Loading state
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.5rem',
    color: 'var(--modal-text-muted, #6b7280)',
  },

  loadingSpinner: {
    width: '1.5rem',
    height: '1.5rem',
    border: '2px solid currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  // Error state
  error: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    gap: '0.5rem',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    borderRadius: '0.375rem',
    margin: '1rem',
  },

  // Empty state
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: 'var(--modal-text-muted, #6b7280)',
  },
};
