/**
 * Trellis PLM Demo Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
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
      { label: 'Dashboard', view: 'product-dashboard', icon: '🏠' },
      { label: 'Products', view: 'products', icon: '📦' },
      { label: 'New Product', view: 'product-create', icon: '➕' },
      { label: 'Product Board', view: 'product-board', icon: '📋' },
      { label: 'Categories', view: 'categories', icon: '📁' },
      { label: 'Suppliers', view: 'suppliers', icon: '🏭' },
      { label: 'Inventory', view: 'inventory', icon: '📊' },
      { label: 'Inventory Overview', view: 'inventory-overview', icon: '📈' },
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
      onRowClick: 'navigate',
      rowClickTarget: 'product-detail',
      hoverable: true,
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
    // Form view: Create new product
    'product-create': {
      block: 'form',
      title: 'New Product',
      route: '/products/new',
      source: 'product',
      mode: 'create',
      fields: [
        { property: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'Enter product name' },
        { property: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'e.g., PCB-001' },
        { property: 'price', label: 'Price', type: 'number', min: 0, step: 0.01, format: 'currency' },
        { property: 'status', label: 'Status', type: 'select', options: [
          { value: 'draft', label: 'Draft' },
          { value: 'active', label: 'Active' },
          { value: 'discontinued', label: 'Discontinued' },
        ]},
      ],
      actions: {
        submit: { type: 'submit', label: 'Create Product', variant: 'primary' },
        cancel: { type: 'cancel', label: 'Cancel', target: 'products' },
      },
    },
    // Detail view: View product details (requires entityId from route)
    'product-detail': {
      block: 'detail',
      title: 'Product Details',
      route: '/products/:id',
      source: 'product',
      entityId: '$route.params.id',
      sections: [
        {
          title: 'Basic Information',
          fields: [
            { property: 'name', label: 'Name' },
            { property: 'sku', label: 'SKU' },
            { property: 'price', label: 'Price', format: 'currency' },
            { property: 'status', label: 'Status', format: 'badge' },
          ],
        },
      ],
      actions: [
        { label: 'Edit', event: 'navigate', target: '/products/${$entity.id}/edit', variant: 'primary' },
        { label: 'Delete', event: 'delete', variant: 'danger', confirm: true, confirmMessage: 'Are you sure you want to delete this product?' },
      ],
    },
    // Form view: Edit existing product
    'product-edit': {
      block: 'form',
      title: 'Edit Product',
      route: '/products/:id/edit',
      source: 'product',
      mode: 'edit',
      entityId: '$route.params.id',
      fields: [
        { property: 'name', label: 'Product Name', type: 'text', required: true, placeholder: 'Enter product name' },
        { property: 'sku', label: 'SKU', type: 'text', required: true, placeholder: 'e.g., PCB-001' },
        { property: 'price', label: 'Price', type: 'number', min: 0, step: 0.01, format: 'currency' },
        { property: 'status', label: 'Status', type: 'select', options: [
          { value: 'draft', label: 'Draft' },
          { value: 'active', label: 'Active' },
          { value: 'discontinued', label: 'Discontinued' },
        ]},
      ],
      actions: {
        submit: { type: 'submit', label: 'Save Changes', variant: 'primary' },
        cancel: { type: 'cancel', label: 'Cancel', target: 'product-detail' },
      },
    },
    // Multi-block: Product Dashboard (table + detail side by side)
    'product-dashboard': {
      title: 'Product Dashboard',
      route: '/dashboard',
      blocks: [
        {
          id: 'product-list',
          type: 'table',
          config: {
            title: 'Products',
            entityType: 'product',
            columns: [
              { property: 'name', label: 'Name' },
              { property: 'sku', label: 'SKU' },
              { property: 'status', label: 'Status', format: 'badge' },
            ],
          },
        },
        {
          id: 'product-detail',
          type: 'detail',
          config: {
            title: 'Product Details',
            source: 'product',
            sections: [
              {
                title: 'Info',
                fields: [
                  { property: 'name', label: 'Name' },
                  { property: 'sku', label: 'SKU' },
                  { property: 'price', label: 'Price', format: 'currency' },
                  { property: 'status', label: 'Status', format: 'badge' },
                ],
              },
            ],
          },
        },
      ],
    },
    // Multi-block: Inventory Overview (table + kanban side by side)
    'inventory-overview': {
      title: 'Inventory Overview',
      route: '/inventory-overview',
      blocks: [
        {
          id: 'inventory-table',
          type: 'table',
          config: {
            title: 'Stock Levels',
            entityType: 'inventory',
            columns: [
              { property: 'product_sku', label: 'SKU' },
              { property: 'quantity', label: 'Qty' },
              { property: 'location', label: 'Location' },
              { property: 'reorder_point', label: 'Reorder At' },
            ],
          },
        },
        {
          id: 'location-kanban',
          type: 'kanban',
          config: {
            title: 'By Location',
            source: 'inventory',
            statusProperty: 'location',
            columns: [
              { value: 'Warehouse A', label: 'Warehouse A', color: '#3b82f6' },
              { value: 'Warehouse B', label: 'Warehouse B', color: '#8b5cf6' },
            ],
            card: {
              title: '${product_sku}',
              subtitle: 'Qty: ${quantity}',
            },
          },
        },
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
