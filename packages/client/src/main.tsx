/**
 * Trellis Demo Entry Point
 *
 * Demonstrates the general-purpose DynamicProductApp that loads
 * product configuration from the server at runtime.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { expandRoles, isRoleName } from '@trellis/kernel';
import './styles.css';
import { DynamicProductApp } from './runtime/DynamicProductApp.js';
import type { UserContext } from './binding/scope.js';

// Get product ID from URL query param or default to "kitchen-sink"
const params = new URLSearchParams(window.location.search);
const productId = params.get('product') ?? 'kitchen-sink';

// Demo RBAC: ?role=admin|editor|viewer switches the demo identity
// (defaults to admin). Drives $can(), showWhen, and action gating.
const roleParam = params.get('role') ?? 'admin';
const role = isRoleName(roleParam) ? roleParam : 'admin';
const demoUser: UserContext = {
  id: 'demo-user',
  name: `Demo ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
  role,
  roles: [role],
  permissions: expandRoles([role]),
};

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DynamicProductApp
        productId={productId}
        apiBaseUrl="/api"  // Proxied through Vite to avoid CORS
        user={demoUser}
      />
    </React.StrictMode>
  );
}
