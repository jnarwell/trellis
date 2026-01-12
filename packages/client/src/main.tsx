/**
 * Trellis PLM Demo Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProductApp } from './runtime/ProductApp.js';
import type { ProductConfig } from './runtime/ProductApp.js';

// Hardcoded PLM config for demo - showcases all block types
const plmConfig: ProductConfig = {
  name: 'PLM Demo',
  version: '0.1.0',
  api: {
    baseUrl: '/api', // Proxied through Vite to avoid CORS
  },
  defaultView: 'products',
  navigation: {
    items: [
      { label: 'Products', view: 'products', icon: '📦' },
      { label: 'Product Board', view: 'product-board', icon: '📋' },
      { label: 'Categories', view: 'categories', icon: '📁' },
      { label: 'Suppliers', view: 'suppliers', icon: '🏭' },
      { label: 'Inventory', view: 'inventory', icon: '📊' },
    ],
  },
  views: {
    // Table view: Products list
    products: {
      block: 'table',
      title: 'Products',
      route: '/products',
      entityType: 'product',
      columns: [
        { property: 'name', label: 'Name', sortable: true },
        { property: 'sku', label: 'SKU', sortable: true },
        { property: 'price', label: 'Price', sortable: true, format: 'currency' },
        { property: 'status', label: 'Status', format: 'badge' },
      ],
    },
    // Kanban view: Products by status
    'product-board': {
      block: 'kanban',
      title: 'Product Board',
      route: '/product-board',
      source: 'product',
      statusProperty: 'status',
      columns: [
        { value: 'draft', label: 'Draft', color: '#9ca3af' },
        { value: 'active', label: 'Active', color: '#22c55e' },
        { value: 'discontinued', label: 'Discontinued', color: '#ef4444' },
      ],
      card: {
        title: '${name}',
        subtitle: '${sku}',
      },
    },
    // Table view: Categories
    categories: {
      block: 'table',
      title: 'Categories',
      route: '/categories',
      entityType: 'category',
      columns: [
        { property: 'name', label: 'Name', sortable: true },
        { property: 'description', label: 'Description' },
      ],
    },
    // Table view: Suppliers
    suppliers: {
      block: 'table',
      title: 'Suppliers',
      route: '/suppliers',
      entityType: 'supplier',
      columns: [
        { property: 'name', label: 'Company', sortable: true },
        { property: 'email', label: 'Email' },
        { property: 'phone', label: 'Phone' },
      ],
    },
    // Table view: Inventory
    inventory: {
      block: 'table',
      title: 'Inventory',
      route: '/inventory',
      entityType: 'inventory',
      columns: [
        { property: 'product_sku', label: 'Product SKU', sortable: true },
        { property: 'quantity', label: 'Qty', sortable: true },
        { property: 'location', label: 'Location' },
        { property: 'reorder_point', label: 'Reorder At' },
      ],
    },
  },
};

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ProductApp config={plmConfig} />
    </React.StrictMode>
  );
}
