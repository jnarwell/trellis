/**
 * Trellis Demo Entry Point
 *
 * Demonstrates the general-purpose DynamicProductApp that loads
 * product configuration from the server at runtime.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { DynamicProductApp } from './runtime/DynamicProductApp.js';

// Get product ID from URL query param or default to "kitchen-sink"
const params = new URLSearchParams(window.location.search);
const productId = params.get('product') ?? 'kitchen-sink';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DynamicProductApp
        productId={productId}
        apiBaseUrl="/api"  // Proxied through Vite to avoid CORS
      />
    </React.StrictMode>
  );
}
