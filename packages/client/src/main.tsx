/**
 * Trellis Demo Entry Point
 *
 * Renders the DemoShell — a guided tour over every config-defined product.
 * Switch tools and roles from the top bar, or open the YAML behind any app.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './demo.css';
import { DemoShell } from './DemoShell.js';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DemoShell />
    </React.StrictMode>
  );
}
