# Trellis Product Configuration Specification

> **Status:** Design Specification
> **Author:** Block System Designer
> **Version:** 0.1.0
> **Depends On:** [Block System Design](../blocks/block-system-design.md), [Kernel Types](../kernel/01-types.ts)

## Overview

A **Product** is a complete application built on Trellis. Products are defined as YAML configuration files that specify:
- Entity types and their properties
- Views (UI layouts composed of blocks)
- Navigation structure
- Event wiring between blocks and views
- Permissions and feature flags

**Key insight:** Products are YAML, not code. Claude Code can generate complete products from requirements. Validation at load time catches all errors before deployment.

---

## Table of Contents

1. [Product Manifest Schema](#1-product-manifest-schema)
2. [Entity Type Definition Schema](#2-entity-type-definition-schema)
3. [View Definition Schema](#3-view-definition-schema)
4. [Navigation Schema](#4-navigation-schema)
5. [Product-Level Wiring](#5-product-level-wiring)
6. [Validation Rules](#6-validation-rules)
7. [Complete PLM Example](#7-complete-plm-example)
8. [Open Questions & Recommendations](#8-open-questions--recommendations)

---

## 1. Product Manifest Schema

The product manifest (`product.yaml`) is the entry point that defines metadata and references other configuration.

### 1.1 TypeScript Interface

```typescript
/**
 * Product manifest - the root configuration for a Trellis product.
 */
export interface ProductManifest {
  /** Unique product identifier (e.g., "plm", "acme.inventory") */
  readonly id: ProductId;

  /** Semantic version */
  readonly version: `${number}.${number}.${number}`;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this product does */
  readonly description: string;

  /** Optional: base product to extend */
  readonly extends?: ProductId;

  /** Feature flags enabled for this product */
  readonly features?: string[];

  /** Default view when product loads */
  readonly defaultView: ViewId;

  /** Required dependencies */
  readonly requires?: ProductRequirements;

  /** Product-level settings */
  readonly settings?: ProductSettings;

  /** File references (resolved at load time) */
  readonly includes?: ProductIncludes;
}

/** Branded type for product identifiers */
export type ProductId = string & { readonly __brand: 'ProductId' };

/** Branded type for view identifiers */
export type ViewId = string & { readonly __brand: 'ViewId' };

/**
 * Dependencies required for this product to function.
 */
export interface ProductRequirements {
  /** Minimum Trellis platform version */
  readonly platformVersion?: string;

  /** Required block types */
  readonly blocks?: BlockType[];

  /** Required entity type libraries */
  readonly entityLibraries?: string[];

  /** Required integrations */
  readonly integrations?: string[];
}

/**
 * Product-level settings and defaults.
 */
export interface ProductSettings {
  /** Default locale */
  readonly locale?: string;

  /** Default timezone */
  readonly timezone?: string;

  /** Theme configuration */
  readonly theme?: ThemeConfig;

  /** Analytics configuration */
  readonly analytics?: AnalyticsConfig;

  /** Custom branding */
  readonly branding?: BrandingConfig;
}

/**
 * File includes for modular configuration.
 */
export interface ProductIncludes {
  /** Glob patterns for entity type files */
  readonly entities?: string | string[];

  /** Glob patterns for view files */
  readonly views?: string | string[];

  /** Glob patterns for relationship files */
  readonly relationships?: string | string[];

  /** Glob patterns for workflow files */
  readonly workflows?: string | string[];

  /** Glob patterns for permission files */
  readonly permissions?: string | string[];
}

/**
 * Theme configuration.
 */
export interface ThemeConfig {
  /** Primary brand color */
  readonly primaryColor?: string;

  /** Color mode preference */
  readonly colorMode?: 'light' | 'dark' | 'system';

  /** Custom CSS variables */
  readonly variables?: Record<string, string>;
}

/**
 * Branding configuration.
 */
export interface BrandingConfig {
  /** Product logo URL */
  readonly logo?: string;

  /** Favicon URL */
  readonly favicon?: string;

  /** Page title template */
  readonly titleTemplate?: string;
}

/**
 * Analytics configuration.
 */
export interface AnalyticsConfig {
  /** Enable analytics */
  readonly enabled: boolean;

  /** Analytics provider */
  readonly provider?: 'trellis' | 'custom';

  /** Custom endpoint */
  readonly endpoint?: string;
}
```

### 1.2 YAML Schema

```yaml
# product.yaml

id: plm                           # Required: unique identifier
version: 2.1.0                    # Required: semver
name: Product Lifecycle Management # Required: display name
description: |                    # Required: description
  Manage parts, assemblies, and engineering documents
  throughout their lifecycle.

extends: trellis.core             # Optional: base product

features:                         # Optional: enabled features
  - bom-management
  - document-control
  - change-orders
  - revision-history

defaultView: parts-list           # Required: initial view

requires:                         # Optional: dependencies
  platformVersion: ">=1.0.0"
  blocks:
    - trellis.data-table
    - trellis.record-view
    - trellis.relationship-tree
  entityLibraries:
    - trellis.audit               # Adds created_at, updated_at, etc.

settings:                         # Optional: product settings
  locale: en-US
  timezone: America/Los_Angeles
  theme:
    primaryColor: "#2563eb"
    colorMode: system
  branding:
    logo: /assets/plm-logo.svg
    titleTemplate: "{{page}} | PLM"

includes:                         # Optional: file references
  entities: entities/*.yaml
  views: views/**/*.yaml
  relationships: relationships/*.yaml
  workflows: workflows/*.yaml
  permissions: permissions/*.yaml
```

---

## 2. Entity Type Definition Schema

Entity types define the data model. They can be defined inline or in separate files.

### 2.1 TypeScript Interface

```typescript
/**
 * Entity type definition in product configuration.
 * Maps to kernel TypeSchema + additional product-specific metadata.
 */
export interface EntityTypeConfig {
  /** Entity type identifier (becomes TypePath) */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Description */
  readonly description?: string;

  /** Icon for UI */
  readonly icon?: string;

  /** Parent type (for inheritance) */
  readonly extends?: string;

  /** Whether this is abstract (cannot be instantiated) */
  readonly abstract?: boolean;

  /** Property definitions */
  readonly properties: PropertyConfig[];

  /** Lifecycle state machine (optional) */
  readonly lifecycle?: LifecycleConfig;

  /** UI configuration hints */
  readonly ui?: EntityUIConfig;

  /** Computed properties (expressions) */
  readonly computed?: ComputedPropertyConfig[];

  /** Indexes for performance */
  readonly indexes?: IndexConfig[];
}

/**
 * Property definition within an entity type.
 */
export interface PropertyConfig {
  /** Property name (becomes PropertyName) */
  readonly name: string;

  /** Display label */
  readonly label?: string;

  /** Property type */
  readonly type: PropertyTypeConfig;

  /** Whether this property is required */
  readonly required?: boolean;

  /** Whether this property must be unique across entities of this type */
  readonly unique?: boolean;

  /** Default value */
  readonly default?: unknown;

  /** Validation rules */
  readonly validation?: PropertyValidation;

  /** Description / help text */
  readonly description?: string;

  /** UI hints */
  readonly ui?: PropertyUIConfig;
}

/**
 * Property type configuration.
 */
export type PropertyTypeConfig =
  // Simple types (string shorthand)
  | 'text' | 'string'
  | 'number' | 'integer'
  | 'boolean'
  | 'datetime' | 'date'
  | 'duration'

  // Complex types (object form)
  | { type: 'text'; maxLength?: number }
  | { type: 'number'; dimension?: DimensionType; unit?: string; min?: number; max?: number }
  | { type: 'integer'; min?: number; max?: number }
  | { type: 'boolean' }
  | { type: 'datetime' }
  | { type: 'date' }
  | { type: 'duration' }
  | { type: 'reference'; entityType: string; displayProperty?: string }
  | { type: 'option'; options: OptionConfig[] }
  | { type: 'list'; element: PropertyTypeConfig; minItems?: number; maxItems?: number }
  | { type: 'record'; fields: Record<string, PropertyConfig> }
  | { type: 'expression'; expression: string; dimension?: DimensionType; unit?: string }
  | { type: 'file'; accept?: string[]; maxSize?: number }
  | { type: 'image'; accept?: string[]; maxSize?: number; dimensions?: ImageDimensions };

/**
 * Option for enum-like properties.
 */
export interface OptionConfig {
  /** Value stored in database */
  readonly value: string;

  /** Display label */
  readonly label: string;

  /** Color for badges/chips */
  readonly color?: string;

  /** Icon */
  readonly icon?: string;

  /** Description */
  readonly description?: string;
}

/**
 * Property validation rules.
 */
export interface PropertyValidation {
  /** Regex pattern (for text) */
  readonly pattern?: string;

  /** Custom error message for pattern */
  readonly patternMessage?: string;

  /** Min length (for text/list) */
  readonly minLength?: number;

  /** Max length (for text/list) */
  readonly maxLength?: number;

  /** Min value (for number) */
  readonly min?: number;

  /** Max value (for number) */
  readonly max?: number;

  /** Custom validator expression */
  readonly custom?: string;

  /** Custom validator error message */
  readonly customMessage?: string;
}

/**
 * Lifecycle state machine configuration.
 */
export interface LifecycleConfig {
  /** Property that holds the state (defaults to 'status') */
  readonly stateProperty?: string;

  /** Available states */
  readonly states: LifecycleState[];

  /** Allowed transitions */
  readonly transitions: LifecycleTransition[];

  /** Initial state for new entities */
  readonly initialState: string;
}

/**
 * A state in the lifecycle.
 */
export interface LifecycleState {
  /** State value */
  readonly value: string;

  /** Display label */
  readonly label: string;

  /** Color for UI */
  readonly color?: string;

  /** Icon */
  readonly icon?: string;

  /** Whether entities in this state are editable */
  readonly editable?: boolean;

  /** Whether entities in this state can be deleted */
  readonly deletable?: boolean;
}

/**
 * A transition between states.
 */
export interface LifecycleTransition {
  /** Source state */
  readonly from: string | string[];

  /** Target state */
  readonly to: string;

  /** Action name (for UI button) */
  readonly action: string;

  /** Display label */
  readonly label?: string;

  /** Required permission */
  readonly permission?: string;

  /** Condition expression (must be true to transition) */
  readonly when?: string;

  /** Actions to run on transition */
  readonly onTransition?: TransitionAction[];
}

/**
 * Action to run on state transition.
 */
export interface TransitionAction {
  /** Action type */
  readonly type: 'set-property' | 'emit-event' | 'call-webhook' | 'send-notification';

  /** Action-specific configuration */
  readonly config: Record<string, unknown>;
}

/**
 * Computed property using expression.
 */
export interface ComputedPropertyConfig {
  /** Property name */
  readonly name: string;

  /** Display label */
  readonly label?: string;

  /** Expression to compute value */
  readonly expression: string;

  /** Result dimension (for numbers) */
  readonly dimension?: DimensionType;

  /** Result unit (for numbers) */
  readonly unit?: string;

  /** Description */
  readonly description?: string;

  /** Dependencies (auto-detected if not specified) */
  readonly dependencies?: string[];
}

/**
 * Index configuration for performance.
 */
export interface IndexConfig {
  /** Index name */
  readonly name: string;

  /** Properties to index */
  readonly properties: string[];

  /** Whether this is a unique index */
  readonly unique?: boolean;

  /** Partial index condition */
  readonly where?: string;
}

/**
 * UI configuration for entity type.
 */
export interface EntityUIConfig {
  /** Property to use as display name */
  readonly displayProperty?: string;

  /** Properties to show in list views */
  readonly listProperties?: string[];

  /** Properties to show in search results */
  readonly searchProperties?: string[];

  /** Property groupings for forms */
  readonly groups?: PropertyGroup[];
}

/**
 * Property group for form layout.
 */
export interface PropertyGroup {
  /** Group name */
  readonly name: string;

  /** Group label */
  readonly label: string;

  /** Properties in this group */
  readonly properties: string[];

  /** Whether collapsed by default */
  readonly collapsed?: boolean;
}

/**
 * UI configuration for a property.
 */
export interface PropertyUIConfig {
  /** Widget type override */
  readonly widget?: string;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Help text shown below input */
  readonly helpText?: string;

  /** Whether to hide in list views */
  readonly hideInList?: boolean;

  /** Whether to hide in forms */
  readonly hideInForm?: boolean;

  /** Display width (columns) */
  readonly width?: number;
}
```

### 2.2 YAML Schema

```yaml
# entities/part.yaml

id: part
name: Part
description: A manufactured or purchased component
icon: cube

extends: trellis.auditable   # Inherit created_at, updated_at, created_by

properties:
  - name: part_number
    label: Part Number
    type: text
    required: true
    unique: true
    validation:
      pattern: "^[A-Z]{2}-\\d{6}$"
      patternMessage: "Must be format XX-000000 (e.g., AB-123456)"
    ui:
      placeholder: "XX-000000"

  - name: name
    label: Name
    type: text
    required: true
    validation:
      maxLength: 200

  - name: description
    label: Description
    type:
      type: text
      maxLength: 2000
    ui:
      widget: textarea
      helpText: "Describe the part's function and key characteristics"

  - name: weight
    label: Weight
    type:
      type: number
      dimension: mass
      unit: kg
      min: 0
    ui:
      helpText: "Weight in kilograms"

  - name: unit_cost
    label: Unit Cost
    type:
      type: number
      dimension: currency
      unit: USD
      min: 0
    ui:
      widget: currency

  - name: material
    label: Material
    type:
      type: reference
      entityType: material
      displayProperty: name
    description: "The primary material this part is made from"

  - name: category
    label: Category
    type:
      type: option
      options:
        - value: mechanical
          label: Mechanical
          color: blue
          icon: cog
        - value: electrical
          label: Electrical
          color: yellow
          icon: zap
        - value: software
          label: Software
          color: purple
          icon: code
        - value: consumable
          label: Consumable
          color: green
          icon: package

  - name: suppliers
    label: Suppliers
    type:
      type: list
      element:
        type: reference
        entityType: supplier
      maxItems: 10

  - name: specifications
    label: Specifications
    type:
      type: record
      fields:
        length:
          name: length
          type:
            type: number
            dimension: length
            unit: mm
        width:
          name: width
          type:
            type: number
            dimension: length
            unit: mm
        height:
          name: height
          type:
            type: number
            dimension: length
            unit: mm

# Computed properties
computed:
  - name: total_cost
    label: Total Cost
    expression: "#unit_cost * #quantity"
    dimension: currency
    unit: USD

  - name: volume
    label: Volume
    expression: "@self.specifications.length * @self.specifications.width * @self.specifications.height"
    dimension: volume
    unit: mm3

# Lifecycle state machine
lifecycle:
  stateProperty: status
  initialState: draft

  states:
    - value: draft
      label: Draft
      color: gray
      icon: pencil
      editable: true
      deletable: true

    - value: in_review
      label: In Review
      color: yellow
      icon: eye
      editable: false
      deletable: false

    - value: released
      label: Released
      color: green
      icon: check-circle
      editable: false
      deletable: false

    - value: obsolete
      label: Obsolete
      color: red
      icon: archive
      editable: false
      deletable: false

  transitions:
    - from: draft
      to: in_review
      action: submit_for_review
      label: Submit for Review
      permission: part.submit

    - from: in_review
      to: released
      action: approve
      label: Approve
      permission: part.approve
      when: "@self.unit_cost != null && @self.material != null"

    - from: in_review
      to: draft
      action: reject
      label: Reject
      permission: part.approve

    - from: released
      to: obsolete
      action: obsolete
      label: Mark Obsolete
      permission: part.obsolete
      onTransition:
        - type: emit-event
          config:
            event: part.obsoleted
            payload:
              partId: $entity.id
              partNumber: $entity.part_number

# Performance indexes
indexes:
  - name: part_number_unique
    properties: [part_number]
    unique: true

  - name: status_category
    properties: [status, category]

  - name: material_lookup
    properties: [material]

# UI configuration
ui:
  displayProperty: name
  listProperties: [part_number, name, status, category, unit_cost]
  searchProperties: [part_number, name, description]
  groups:
    - name: identification
      label: Identification
      properties: [part_number, name, description, category]
    - name: physical
      label: Physical Properties
      properties: [weight, material, specifications]
    - name: cost
      label: Cost & Suppliers
      properties: [unit_cost, suppliers]
```

---

## 3. View Definition Schema

Views define UI layouts composed of blocks. They support multiple layout types and data binding.

### 3.1 TypeScript Interface

```typescript
/**
 * View definition - a screen/page in the product.
 */
export interface ViewConfig {
  /** View identifier */
  readonly id: ViewId;

  /** Display name */
  readonly name: string;

  /** Description */
  readonly description?: string;

  /** Route pattern for this view */
  readonly route: RoutePattern;

  /** Layout definition */
  readonly layout: LayoutConfig;

  /** View-level data bindings */
  readonly data?: ViewDataConfig;

  /** Wiring between blocks in this view */
  readonly wiring?: WiringSpec[];

  /** View-level permissions */
  readonly permissions?: ViewPermissions;

  /** Page metadata */
  readonly meta?: ViewMeta;
}

/**
 * Route pattern with parameters.
 * Parameters: :paramName (required), :paramName? (optional)
 * Query params defined separately.
 */
export type RoutePattern = string;

/**
 * View data configuration - how the view gets its data.
 */
export interface ViewDataConfig {
  /** Route parameters schema */
  readonly params?: Record<string, ParamConfig>;

  /** Query parameters schema */
  readonly query?: Record<string, QueryParamConfig>;

  /** Data queries to run on view load */
  readonly queries?: Record<string, ViewQueryConfig>;

  /** Computed values from params/queries */
  readonly computed?: Record<string, string>;
}

/**
 * Route parameter configuration.
 */
export interface ParamConfig {
  /** Parameter type */
  readonly type: 'entityId' | 'string' | 'number';

  /** Entity type (if type is 'entityId') */
  readonly entityType?: string;

  /** Whether to fetch the entity */
  readonly fetch?: boolean;

  /** Alias for the fetched entity in scope */
  readonly as?: string;
}

/**
 * Query parameter configuration.
 */
export interface QueryParamConfig {
  /** Parameter type */
  readonly type: 'string' | 'number' | 'boolean' | 'array';

  /** Default value */
  readonly default?: unknown;

  /** Whether parameter is required */
  readonly required?: boolean;

  /** Enum values (if constrained) */
  readonly enum?: string[];
}

/**
 * Query configuration for loading data.
 */
export interface ViewQueryConfig {
  /** Entity type to query */
  readonly entityType: string;

  /** Filter expression */
  readonly filter?: string;

  /** Sort specification */
  readonly sort?: SortSpec[];

  /** Relationships to include */
  readonly include?: string[];

  /** Pagination */
  readonly limit?: number;
}

/**
 * Layout configuration - how blocks are arranged.
 */
export type LayoutConfig =
  | SingleLayout
  | SplitLayout
  | TabsLayout
  | GridLayout
  | StackLayout;

/**
 * Single block layout.
 */
export interface SingleLayout {
  readonly type: 'single';
  readonly block: BlockPlacement;
}

/**
 * Split panel layout.
 */
export interface SplitLayout {
  readonly type: 'split';
  readonly direction: 'horizontal' | 'vertical';
  /** Sizes as percentages or pixels (e.g., [60, 40] or ["300px", "auto"]) */
  readonly sizes?: (number | string)[];
  /** Whether panels are resizable */
  readonly resizable?: boolean;
  /** Minimum sizes for each panel */
  readonly minSizes?: (number | string)[];
  /** Panel definitions */
  readonly panels: PanelConfig[];
}

/**
 * Tab layout.
 */
export interface TabsLayout {
  readonly type: 'tabs';
  /** Tab position */
  readonly position?: 'top' | 'bottom' | 'left' | 'right';
  /** Default active tab index */
  readonly defaultTab?: number;
  /** Tab definitions */
  readonly tabs: TabConfig[];
}

/**
 * Grid layout.
 */
export interface GridLayout {
  readonly type: 'grid';
  /** Number of columns */
  readonly columns: number;
  /** Gap between cells */
  readonly gap?: string;
  /** Row definitions */
  readonly rows: GridRowConfig[];
}

/**
 * Stack layout (vertical or horizontal list of blocks).
 */
export interface StackLayout {
  readonly type: 'stack';
  readonly direction?: 'vertical' | 'horizontal';
  readonly gap?: string;
  readonly blocks: BlockPlacement[];
}

/**
 * Panel in a split layout.
 */
export interface PanelConfig {
  /** Panel ID (for targeting in wiring) */
  readonly id?: string;
  /** Blocks in this panel */
  readonly blocks: BlockPlacement[];
  /** Nested layout (instead of blocks) */
  readonly layout?: LayoutConfig;
}

/**
 * Tab in a tabs layout.
 */
export interface TabConfig {
  /** Tab identifier */
  readonly id?: string;
  /** Tab label */
  readonly label: string;
  /** Tab icon */
  readonly icon?: string;
  /** Badge value or expression */
  readonly badge?: string | number;
  /** Condition for showing this tab */
  readonly showWhen?: string;
  /** Block(s) in this tab */
  readonly block?: BlockPlacement;
  readonly blocks?: BlockPlacement[];
  /** Nested layout (instead of blocks) */
  readonly layout?: LayoutConfig;
}

/**
 * Grid row configuration.
 */
export interface GridRowConfig {
  /** Row height */
  readonly height?: string;
  /** Cells in this row */
  readonly cells: GridCellConfig[];
}

/**
 * Grid cell configuration.
 */
export interface GridCellConfig {
  /** Column span */
  readonly colspan?: number;
  /** Row span */
  readonly rowspan?: number;
  /** Block in this cell */
  readonly block?: BlockPlacement;
  /** Nested layout */
  readonly layout?: LayoutConfig;
}

/**
 * Block placement within a layout.
 */
export interface BlockPlacement {
  /** Block type (from block registry) */
  readonly type: BlockType;

  /** Instance ID (for wiring) */
  readonly id?: BlockInstanceId;

  /** Block props */
  readonly props: Record<string, PropValue | DataBinding>;

  /** Slot contents */
  readonly slots?: Record<string, BlockPlacement[]>;

  /** Condition for showing this block */
  readonly showWhen?: string;
}

/**
 * Data binding expression.
 * Syntax: $scope.path or ${expression}
 */
export type DataBinding = string;

/**
 * View permissions.
 */
export interface ViewPermissions {
  /** Permission required to access this view */
  readonly access?: string;

  /** Permission required for specific actions */
  readonly actions?: Record<string, string>;
}

/**
 * Page metadata.
 */
export interface ViewMeta {
  /** Page title (supports templates) */
  readonly title?: string;

  /** Meta description */
  readonly description?: string;

  /** Whether to show in browser history */
  readonly history?: boolean;
}
```

### 3.2 YAML Schema

```yaml
# views/part-detail.yaml

id: part-detail
name: Part Detail
description: Detailed view of a single part with BOM and documents

route: /parts/:entityId

# Data configuration
data:
  params:
    entityId:
      type: entityId
      entityType: part
      fetch: true
      as: part

  query:
    tab:
      type: string
      default: details
      enum: [details, bom, documents, history]

  queries:
    children:
      entityType: part
      filter: "relationships.parent == $params.entityId"
      include: [material]
      limit: 100

# Layout definition
layout:
  type: split
  direction: horizontal
  sizes: [65, 35]
  resizable: true
  minSizes: [400, 300]

  panels:
    # Left panel - main content
    - id: main
      layout:
        type: stack
        direction: vertical
        gap: 16px
        blocks:
          - type: trellis.page-header
            id: header
            props:
              title: $part.name
              subtitle: $part.part_number
              status: $part.status
              actions:
                - label: Edit
                  icon: pencil
                  action: edit
                  showWhen: $part.status == "draft"
                - label: Submit for Review
                  icon: send
                  action: submit
                  showWhen: $part.status == "draft"

          - type: trellis.tabs
            id: main-tabs
            props:
              activeTab: $query.tab
              onTabChange: $setQuery({ tab: $event.tab })
            slots:
              tabs:
                # Details tab
                - type: trellis.tab-panel
                  props:
                    id: details
                    label: Details
                    icon: info
                  slots:
                    content:
                      - type: trellis.property-editor
                        id: props-editor
                        props:
                          entityId: $params.entityId
                          entityType: part
                          readOnly: $part.status != "draft"
                          sections:
                            - label: Identification
                              properties: [part_number, name, description, category]
                            - label: Physical Properties
                              properties: [weight, material, specifications]
                            - label: Cost
                              properties: [unit_cost, total_cost]

                # BOM tab
                - type: trellis.tab-panel
                  props:
                    id: bom
                    label: BOM
                    icon: layers
                    badge: $children.length
                  slots:
                    content:
                      - type: trellis.relationship-tree
                        id: bom-tree
                        props:
                          entityId: $params.entityId
                          relationshipType: bom_contains
                          direction: children
                          expandDepth: 2
                          columns:
                            - property: part_number
                              label: Part #
                              width: 150
                            - property: name
                              label: Name
                            - property: quantity
                              label: Qty
                              width: 80
                            - property: unit_cost
                              label: Unit Cost
                              width: 100

                # Documents tab
                - type: trellis.tab-panel
                  props:
                    id: documents
                    label: Documents
                    icon: file
                  slots:
                    content:
                      - type: trellis.relationship-list
                        id: documents-list
                        props:
                          entityId: $params.entityId
                          relationshipType: has_document
                          entityType: document
                          columns:
                            - property: name
                              label: Document
                            - property: version
                              label: Version
                            - property: type
                              label: Type
                          actions:
                            - label: Upload
                              icon: upload
                              action: upload

                # History tab
                - type: trellis.tab-panel
                  props:
                    id: history
                    label: History
                    icon: clock
                  slots:
                    content:
                      - type: trellis.audit-log
                        id: audit-log
                        props:
                          entityId: $params.entityId
                          showDetails: true

    # Right panel - sidebar
    - id: sidebar
      blocks:
        - type: trellis.card
          props:
            title: Where Used
          slots:
            content:
              - type: trellis.relationship-tree
                id: where-used
                props:
                  entityId: $params.entityId
                  relationshipType: bom_contains
                  direction: parents
                  maxDepth: 3

        - type: trellis.card
          props:
            title: Related Parts
          slots:
            content:
              - type: trellis.entity-list
                id: related
                props:
                  entityType: part
                  filter: "category == $part.category && id != $part.id"
                  limit: 5
                  compact: true

# Wiring between blocks
wiring:
  # Click on BOM item navigates to that part
  - from: bom-tree
    event: nodeSelected
    to: $navigate
    receiver: push
    transform:
      kind: expression
      expr: "{ path: '/parts/' + payload.entityId }"

  # Click on where-used navigates to parent
  - from: where-used
    event: nodeSelected
    to: $navigate
    receiver: push
    transform:
      kind: expression
      expr: "{ path: '/parts/' + payload.entityId }"

  # Click on related part navigates
  - from: related
    event: rowSelected
    to: $navigate
    receiver: push
    transform:
      kind: expression
      expr: "{ path: '/parts/' + payload.entityId }"

  # Document upload refreshes list
  - from: documents-list
    event: documentUploaded
    to: documents-list
    receiver: refresh

# Permissions
permissions:
  access: part.view
  actions:
    edit: part.edit
    submit: part.submit
    upload: document.upload

# Page metadata
meta:
  title: "${part.part_number} - ${part.name}"
  description: "View and manage part ${part.part_number}"
```

---

## 4. Navigation Schema

Navigation defines the sidebar menu, breadcrumbs, and routing structure.

### 4.1 TypeScript Interface

```typescript
/**
 * Navigation configuration for the product.
 */
export interface NavigationConfig {
  /** Navigation sections */
  readonly sections: NavSection[];

  /** Breadcrumb configuration */
  readonly breadcrumbs?: BreadcrumbConfig;

  /** Quick actions (global shortcuts) */
  readonly quickActions?: QuickAction[];

  /** Search configuration */
  readonly search?: SearchConfig;
}

/**
 * Navigation section (group of items).
 */
export interface NavSection {
  /** Section identifier */
  readonly id?: string;

  /** Section label (null for ungrouped items) */
  readonly label?: string;

  /** Whether section is collapsible */
  readonly collapsible?: boolean;

  /** Whether collapsed by default */
  readonly collapsed?: boolean;

  /** Condition for showing this section */
  readonly showWhen?: string;

  /** Permission required to see this section */
  readonly permission?: string;

  /** Items in this section */
  readonly items: NavItem[];
}

/**
 * Navigation item.
 */
export interface NavItem {
  /** Item identifier */
  readonly id: string;

  /** Display label */
  readonly label: string;

  /** Icon */
  readonly icon?: string;

  /** Target view ID */
  readonly view?: ViewId;

  /** External URL (mutually exclusive with view) */
  readonly href?: string;

  /** Badge configuration */
  readonly badge?: NavBadge;

  /** Condition for showing this item */
  readonly showWhen?: string;

  /** Permission required */
  readonly permission?: string;

  /** Nested items (sub-menu) */
  readonly children?: NavItem[];

  /** Whether item is active for routes matching prefix */
  readonly activeOnPrefix?: boolean;

  /** Additional routes that mark this item active */
  readonly activeRoutes?: string[];
}

/**
 * Navigation badge.
 */
export interface NavBadge {
  /** Badge type */
  readonly type: 'count' | 'dot' | 'text';

  /** Value (expression for count, static for text) */
  readonly value?: string | number;

  /** Query to get count */
  readonly query?: {
    entityType: string;
    filter?: string;
  };

  /** Color */
  readonly color?: 'default' | 'primary' | 'success' | 'warning' | 'error';

  /** Max value to show (shows "99+" if exceeded) */
  readonly max?: number;
}

/**
 * Breadcrumb configuration.
 */
export interface BreadcrumbConfig {
  /** Whether to show home link */
  readonly showHome?: boolean;

  /** Home link label */
  readonly homeLabel?: string;

  /** View-specific breadcrumb overrides */
  readonly overrides?: Record<ViewId, BreadcrumbOverride>;
}

/**
 * Breadcrumb override for a specific view.
 */
export interface BreadcrumbOverride {
  /** Static crumbs to prepend */
  readonly prepend?: BreadcrumbItem[];

  /** Custom crumbs (replaces auto-generated) */
  readonly items?: BreadcrumbItem[];
}

/**
 * A breadcrumb item.
 */
export interface BreadcrumbItem {
  /** Label (supports templates) */
  readonly label: string;

  /** View to link to */
  readonly view?: ViewId;

  /** View params */
  readonly params?: Record<string, string>;

  /** External href */
  readonly href?: string;
}

/**
 * Quick action (global shortcut).
 */
export interface QuickAction {
  /** Action identifier */
  readonly id: string;

  /** Display label */
  readonly label: string;

  /** Icon */
  readonly icon: string;

  /** Keyboard shortcut */
  readonly shortcut?: string;

  /** Action type */
  readonly action: QuickActionType;

  /** Permission required */
  readonly permission?: string;

  /** Condition for availability */
  readonly showWhen?: string;
}

/**
 * Quick action type.
 */
export type QuickActionType =
  | { type: 'navigate'; view: ViewId; params?: Record<string, string> }
  | { type: 'create'; entityType: string }
  | { type: 'search'; scope?: string }
  | { type: 'command'; command: string };

/**
 * Global search configuration.
 */
export interface SearchConfig {
  /** Entity types to include in search */
  readonly entityTypes: SearchEntityConfig[];

  /** Keyboard shortcut to focus search */
  readonly shortcut?: string;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Recent searches count */
  readonly recentCount?: number;
}

/**
 * Search configuration for an entity type.
 */
export interface SearchEntityConfig {
  /** Entity type */
  readonly entityType: string;

  /** Properties to search */
  readonly searchProperties: string[];

  /** Properties to display in results */
  readonly displayProperties: string[];

  /** View to navigate to on selection */
  readonly targetView: ViewId;

  /** Param name for entity ID */
  readonly paramName?: string;
}
```

### 4.2 YAML Schema

```yaml
# navigation.yaml (can be in product.yaml or separate file)

navigation:
  sections:
    # Main section (no label = ungrouped at top)
    - items:
        - id: dashboard
          label: Dashboard
          icon: home
          view: dashboard

    # Parts section
    - label: Parts Management
      collapsible: true
      items:
        - id: parts
          label: Parts
          icon: cube
          view: parts-list
          badge:
            type: count
            query:
              entityType: part
              filter: "#status == 'draft'"
            color: warning
            max: 99
          activeOnPrefix: true
          activeRoutes:
            - /parts/*

        - id: assemblies
          label: Assemblies
          icon: layers
          view: assemblies-list
          activeOnPrefix: true

        - id: materials
          label: Materials
          icon: flask
          view: materials-list
          permission: materials.view

    # Documents section
    - label: Documents
      collapsible: true
      collapsed: true
      items:
        - id: documents
          label: All Documents
          icon: file
          view: documents-list

        - id: pending-review
          label: Pending Review
          icon: clock
          view: documents-list
          # Pass query params to filter
          badge:
            type: count
            query:
              entityType: document
              filter: "#status == 'pending_review'"
            color: primary

    # Admin section (conditional)
    - label: Administration
      showWhen: $user.role == 'admin'
      permission: admin.access
      items:
        - id: users
          label: Users
          icon: users
          view: users-list
          permission: users.manage

        - id: settings
          label: Settings
          icon: settings
          view: settings
          permission: settings.manage

  # Breadcrumb configuration
  breadcrumbs:
    showHome: true
    homeLabel: PLM
    overrides:
      part-detail:
        prepend:
          - label: Parts
            view: parts-list
        items:
          - label: Parts
            view: parts-list
          - label: $part.part_number

  # Quick actions
  quickActions:
    - id: new-part
      label: New Part
      icon: plus
      shortcut: Ctrl+Shift+P
      action:
        type: create
        entityType: part
      permission: part.create

    - id: search
      label: Search
      icon: search
      shortcut: Ctrl+K
      action:
        type: search

    - id: quick-nav
      label: Go to...
      icon: compass
      shortcut: Ctrl+G
      action:
        type: command
        command: quick-nav

  # Search configuration
  search:
    shortcut: Ctrl+K
    placeholder: Search parts, documents, assemblies...
    recentCount: 5
    entityTypes:
      - entityType: part
        searchProperties: [part_number, name, description]
        displayProperties: [part_number, name, status]
        targetView: part-detail
        paramName: entityId

      - entityType: document
        searchProperties: [name, document_number]
        displayProperties: [document_number, name, type]
        targetView: document-detail
        paramName: entityId

      - entityType: assembly
        searchProperties: [assembly_number, name]
        displayProperties: [assembly_number, name]
        targetView: assembly-detail
        paramName: entityId
```

---

## 5. Product-Level Wiring

Product-level wiring handles cross-view communication, global event handlers, and navigation triggers.

### 5.1 TypeScript Interface

```typescript
/**
 * Product-level wiring configuration.
 * Extends the view-level WiringSpec with product-wide capabilities.
 */
export interface ProductWiringConfig {
  /** Cross-view navigation wiring */
  readonly navigation?: NavigationWiring[];

  /** Global event handlers */
  readonly globalHandlers?: GlobalEventHandler[];

  /** View lifecycle hooks */
  readonly viewHooks?: ViewHookConfig[];
}

/**
 * Navigation wiring - events that trigger view navigation.
 */
export interface NavigationWiring {
  /** Source: which view and block */
  readonly source: WiringSource;

  /** Event that triggers navigation */
  readonly event: string;

  /** Target view */
  readonly targetView: ViewId;

  /** How to build route params from event payload */
  readonly params?: Record<string, string>;

  /** How to build query params from event payload */
  readonly query?: Record<string, string>;

  /** Navigation mode */
  readonly mode?: 'push' | 'replace';

  /** Condition for this wiring */
  readonly when?: string;
}

/**
 * Source specification for wiring.
 */
export interface WiringSource {
  /** View ID (or '*' for any view) */
  readonly view: ViewId | '*';

  /** Block instance ID (or '*' for any block of type) */
  readonly block: BlockInstanceId | '*';

  /** Block type (when block is '*') */
  readonly blockType?: BlockType;
}

/**
 * Global event handler - runs for events across all views.
 */
export interface GlobalEventHandler {
  /** Handler identifier */
  readonly id: string;

  /** Description */
  readonly description?: string;

  /** Event source pattern */
  readonly source: WiringSource;

  /** Event name pattern (supports wildcards) */
  readonly event: string | string[];

  /** Handler actions */
  readonly actions: GlobalAction[];

  /** Condition for this handler */
  readonly when?: string;

  /** Whether to prevent default handling */
  readonly preventDefault?: boolean;
}

/**
 * Global action types.
 */
export type GlobalAction =
  | { type: 'analytics'; event: string; properties?: Record<string, string> }
  | { type: 'notification'; message: string; level?: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'webhook'; url: string; method?: string; payload?: Record<string, string> }
  | { type: 'emit'; event: string; payload?: Record<string, string> }
  | { type: 'log'; level?: 'debug' | 'info' | 'warn' | 'error'; message: string }
  | { type: 'refresh'; target: 'view' | 'block'; blockId?: string };

/**
 * View lifecycle hook configuration.
 */
export interface ViewHookConfig {
  /** View ID (or '*' for all views) */
  readonly view: ViewId | '*';

  /** Lifecycle event */
  readonly lifecycle: 'enter' | 'leave' | 'update';

  /** Actions to run */
  readonly actions: GlobalAction[];

  /** Condition */
  readonly when?: string;
}

/**
 * Built-in navigation receiver (available as $navigate).
 */
export interface NavigationReceiver {
  /** Push new route to history */
  push(params: { path: string; query?: Record<string, string> }): void;

  /** Replace current route */
  replace(params: { path: string; query?: Record<string, string> }): void;

  /** Go back in history */
  back(): void;

  /** Go forward in history */
  forward(): void;

  /** Navigate to view by ID */
  toView(params: { view: ViewId; params?: Record<string, string>; query?: Record<string, string> }): void;
}
```

### 5.2 YAML Schema

```yaml
# wiring.yaml (product-level wiring)

wiring:
  # Cross-view navigation
  navigation:
    # Any data-table row click navigates to detail view
    - source:
        view: "*"
        block: "*"
        blockType: trellis.data-table
      event: rowSelected
      targetView: $inferDetailView(payload.entityType)
      params:
        entityId: $payload.entityId
      mode: push

    # BOM tree node selection navigates to part detail
    - source:
        view: part-detail
        block: bom-tree
      event: nodeSelected
      targetView: part-detail
      params:
        entityId: $payload.entityId
      when: $payload.entityType == "part"

    # Create button navigates to create form
    - source:
        view: "*"
        block: "*"
      event: createRequested
      targetView: $payload.entityType + "-create"
      mode: push

  # Global event handlers
  globalHandlers:
    # Track all entity views in analytics
    - id: analytics-entity-view
      description: Track entity views for analytics
      source:
        view: "*"
        block: "*"
        blockType: trellis.record-view
      event: entityLoaded
      actions:
        - type: analytics
          event: entity_viewed
          properties:
            entity_type: $payload.entityType
            entity_id: $payload.entityId

    # Show notification on successful save
    - id: save-success-notification
      source:
        view: "*"
        block: "*"
      event: entitySaved
      actions:
        - type: notification
          message: "${payload.entityType} saved successfully"
          level: success

    # Log errors globally
    - id: error-logger
      source:
        view: "*"
        block: "*"
      event: error
      actions:
        - type: log
          level: error
          message: "Error in ${source.view}/${source.block}: ${payload.message}"

    # Webhook on part release
    - id: part-release-webhook
      description: Notify external system when part is released
      source:
        view: "*"
        block: "*"
      event: lifecycleTransition
      when: $payload.entityType == "part" && $payload.toState == "released"
      actions:
        - type: webhook
          url: https://api.example.com/webhooks/part-released
          method: POST
          payload:
            partId: $payload.entityId
            partNumber: $payload.entity.part_number
            releasedBy: $user.id
            releasedAt: $now

  # View lifecycle hooks
  viewHooks:
    # Refresh data when returning to list views
    - view: "*-list"
      lifecycle: enter
      actions:
        - type: refresh
          target: view

    # Log view transitions
    - view: "*"
      lifecycle: enter
      actions:
        - type: analytics
          event: page_view
          properties:
            view: $view.id
            path: $route.path

    # Warn about unsaved changes
    - view: "*"
      lifecycle: leave
      when: $view.hasUnsavedChanges
      actions:
        - type: emit
          event: confirmNavigation
          payload:
            message: "You have unsaved changes. Are you sure you want to leave?"
```

---

## 6. Validation Rules

Comprehensive validation ensures products are correct before deployment.

### 6.1 Validation Categories

```typescript
/**
 * Product validation result.
 */
export interface ProductValidationResult {
  readonly valid: boolean;
  readonly productId: ProductId;
  readonly errors: ProductValidationError[];
  readonly warnings: ProductValidationWarning[];

  /** Breakdown by category */
  readonly byCategory: {
    manifest: ValidationResult;
    entities: ValidationResult;
    views: ValidationResult;
    navigation: ValidationResult;
    wiring: ValidationResult;
    permissions: ValidationResult;
  };
}

/**
 * Validation error with full context.
 * Follows the same pattern as BlockValidationError for consistency.
 */
export interface ProductValidationError {
  readonly category: ProductErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly path: string[];
  readonly value: unknown;
  readonly expected: string;
  readonly suggestions: string[];
  readonly location?: {
    file: string;
    line: number;
    column: number;
  };
  readonly docsUrl?: string;
}

export type ProductErrorCategory =
  | 'manifest-invalid'
  | 'entity-invalid'
  | 'view-invalid'
  | 'navigation-invalid'
  | 'wiring-invalid'
  | 'permission-invalid'
  | 'reference-broken'
  | 'circular-dependency'
  | 'type-mismatch'
  | 'missing-required';
```

### 6.2 Validation Rules

```typescript
/**
 * All validation rules for products.
 */
export const ProductValidationRules = {
  // =========================================================================
  // MANIFEST VALIDATION
  // =========================================================================

  manifest: {
    /** Product ID must be valid identifier */
    validProductId: {
      code: 'INVALID_PRODUCT_ID',
      validate: (id: string) => /^[a-z][a-z0-9_.-]*$/.test(id),
      message: "Product ID '{{value}}' is invalid. Must start with lowercase letter, contain only lowercase letters, numbers, underscores, dots, or hyphens.",
      suggestions: ['Use lowercase: {{value.toLowerCase()}}']
    },

    /** Version must be valid semver */
    validVersion: {
      code: 'INVALID_VERSION',
      validate: (version: string) => /^\d+\.\d+\.\d+$/.test(version),
      message: "Version '{{value}}' is not valid semver. Expected format: X.Y.Z",
      suggestions: ['1.0.0']
    },

    /** defaultView must reference existing view */
    defaultViewExists: {
      code: 'DEFAULT_VIEW_NOT_FOUND',
      validate: (viewId: string, ctx: ValidationContext) => ctx.views.has(viewId),
      message: "Default view '{{value}}' not found. Available views: {{available}}.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.views.keys()))
    },

    /** extends must reference valid base product */
    extendsExists: {
      code: 'BASE_PRODUCT_NOT_FOUND',
      validate: (productId: string, ctx: ValidationContext) =>
        productId === undefined || ctx.products.has(productId),
      message: "Base product '{{value}}' not found.",
      suggestions: ['trellis.core', 'trellis.base']
    }
  },

  // =========================================================================
  // ENTITY VALIDATION
  // =========================================================================

  entity: {
    /** Entity ID must be valid identifier */
    validEntityId: {
      code: 'INVALID_ENTITY_ID',
      validate: (id: string) => /^[a-z][a-z0-9_]*$/.test(id),
      message: "Entity type ID '{{value}}' is invalid. Must be lowercase with underscores.",
      suggestions: ['{{value.toLowerCase().replace(/[^a-z0-9]/g, "_")}}']
    },

    /** Property names must be valid */
    validPropertyName: {
      code: 'INVALID_PROPERTY_NAME',
      validate: (name: string) => /^[a-z][a-z0-9_]*$/.test(name),
      message: "Property name '{{value}}' is invalid. Use snake_case.",
      suggestions: ['{{toSnakeCase(value)}}']
    },

    /** Reference entity types must exist */
    referenceTypeExists: {
      code: 'REFERENCE_TYPE_NOT_FOUND',
      validate: (ref: string, ctx: ValidationContext) => ctx.entities.has(ref),
      message: "Referenced entity type '{{value}}' not found. Available: {{available}}.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.entities.keys()))
    },

    /** Lifecycle states must be unique */
    uniqueLifecycleStates: {
      code: 'DUPLICATE_LIFECYCLE_STATE',
      validate: (states: LifecycleState[]) => {
        const values = states.map(s => s.value);
        return values.length === new Set(values).size;
      },
      message: "Duplicate lifecycle state '{{duplicate}}' found.",
      suggestions: ['Remove duplicate state or rename one']
    },

    /** Transition states must exist */
    transitionStatesExist: {
      code: 'TRANSITION_STATE_NOT_FOUND',
      validate: (transition: LifecycleTransition, states: Set<string>) =>
        (Array.isArray(transition.from)
          ? transition.from.every(s => states.has(s))
          : states.has(transition.from)) && states.has(transition.to),
      message: "Transition references unknown state. From: '{{from}}', To: '{{to}}'. Available: {{available}}.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.states))
    },

    /** Computed expression must be valid */
    validComputedExpression: {
      code: 'INVALID_COMPUTED_EXPRESSION',
      validate: (expr: string) => parseExpression(expr).valid,
      message: "Invalid expression: {{error}} at position {{position}}. Expression: '{{value}}'",
      suggestions: ['Check expression syntax']
    },

    /** Computed dependencies must exist */
    computedDependenciesExist: {
      code: 'COMPUTED_DEPENDENCY_NOT_FOUND',
      validate: (deps: string[], properties: Set<string>) =>
        deps.every(d => properties.has(d) || d.startsWith('self.')),
      message: "Computed property references unknown property '{{missing}}'.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.properties))
    }
  },

  // =========================================================================
  // VIEW VALIDATION
  // =========================================================================

  view: {
    /** View ID must be valid */
    validViewId: {
      code: 'INVALID_VIEW_ID',
      validate: (id: string) => /^[a-z][a-z0-9-]*$/.test(id),
      message: "View ID '{{value}}' is invalid. Use kebab-case.",
      suggestions: ['{{toKebabCase(value)}}']
    },

    /** Route must be valid pattern */
    validRoute: {
      code: 'INVALID_ROUTE',
      validate: (route: string) => /^\/[a-z0-9/:_-]*$/.test(route),
      message: "Route '{{value}}' is invalid. Must start with / and contain valid path segments.",
      suggestions: ['/{{toKebabCase(viewId)}}']
    },

    /** Route params must be defined in data.params */
    routeParamsDefined: {
      code: 'UNDEFINED_ROUTE_PARAM',
      validate: (route: string, params: Record<string, ParamConfig>) => {
        const routeParams = route.match(/:([a-zA-Z]+)/g)?.map(p => p.slice(1)) || [];
        return routeParams.every(p => p in params);
      },
      message: "Route parameter ':{{param}}' is not defined in data.params.",
      suggestions: ['Add {{param}} to data.params']
    },

    /** Block types must exist */
    blockTypeExists: {
      code: 'BLOCK_TYPE_NOT_FOUND',
      validate: (type: string, ctx: ValidationContext) => ctx.blocks.has(type),
      message: "Block type '{{value}}' not found. Available: {{available}}.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.blocks.keys()))
    },

    /** Block props must be valid for block type */
    validBlockProps: {
      code: 'INVALID_BLOCK_PROP',
      // Delegates to block validation system
      validate: (props: Record<string, unknown>, blockSpec: BlockSpec) =>
        validateBlockProps(props, blockSpec),
      message: "{{blockError.message}}",
      suggestions: (ctx) => ctx.blockError.suggestions
    },

    /** Data bindings must reference valid scope */
    validDataBinding: {
      code: 'INVALID_DATA_BINDING',
      validate: (binding: string, scope: Set<string>) => {
        const ref = binding.match(/^\$([a-zA-Z_]+)/)?.[1];
        return ref === undefined || scope.has(ref);
      },
      message: "Data binding '{{value}}' references unknown scope '{{ref}}'. Available: {{available}}.",
      suggestions: (ctx) => ctx.findSimilar(ctx.ref, Array.from(ctx.scope))
    },

    /** Entity type in data queries must exist */
    queryEntityTypeExists: {
      code: 'QUERY_ENTITY_TYPE_NOT_FOUND',
      validate: (type: string, ctx: ValidationContext) => ctx.entities.has(type),
      message: "Query entity type '{{value}}' not found.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.entities.keys()))
    }
  },

  // =========================================================================
  // NAVIGATION VALIDATION
  // =========================================================================

  navigation: {
    /** Nav item view must exist */
    navViewExists: {
      code: 'NAV_VIEW_NOT_FOUND',
      validate: (viewId: string, ctx: ValidationContext) =>
        viewId === undefined || ctx.views.has(viewId),
      message: "Navigation item references unknown view '{{value}}'.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.views.keys()))
    },

    /** Nav item IDs must be unique */
    uniqueNavIds: {
      code: 'DUPLICATE_NAV_ID',
      validate: (items: NavItem[]) => {
        const ids = items.map(i => i.id);
        return ids.length === new Set(ids).size;
      },
      message: "Duplicate navigation item ID '{{duplicate}}'.",
      suggestions: ['Rename one of the duplicate items']
    },

    /** Badge query entity type must exist */
    badgeQueryEntityExists: {
      code: 'BADGE_ENTITY_NOT_FOUND',
      validate: (type: string, ctx: ValidationContext) => ctx.entities.has(type),
      message: "Badge query references unknown entity type '{{value}}'.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.entities.keys()))
    }
  },

  // =========================================================================
  // WIRING VALIDATION
  // =========================================================================

  wiring: {
    /** Source view must exist (unless wildcard) */
    sourceViewExists: {
      code: 'WIRING_SOURCE_VIEW_NOT_FOUND',
      validate: (view: string, ctx: ValidationContext) =>
        view === '*' || ctx.views.has(view),
      message: "Wiring source references unknown view '{{value}}'.",
      suggestions: (ctx) => ['*', ...ctx.findSimilar(ctx.value, Array.from(ctx.views.keys()))]
    },

    /** Source block must exist in source view (unless wildcard) */
    sourceBlockExists: {
      code: 'WIRING_SOURCE_BLOCK_NOT_FOUND',
      validate: (block: string, view: string, ctx: ValidationContext) =>
        block === '*' || view === '*' || ctx.getViewBlocks(view).has(block),
      message: "Wiring source references unknown block '{{block}}' in view '{{view}}'.",
      suggestions: (ctx) => ['*', ...ctx.findSimilar(ctx.block, Array.from(ctx.getViewBlocks(ctx.view)))]
    },

    /** Event must exist on source block type */
    eventExists: {
      code: 'WIRING_EVENT_NOT_FOUND',
      validate: (event: string, blockType: string, ctx: ValidationContext) => {
        const spec = ctx.blocks.get(blockType);
        return spec === undefined || event in spec.emits;
      },
      message: "Event '{{event}}' not found on block type '{{blockType}}'. Available: {{available}}.",
      suggestions: (ctx) => ctx.findSimilar(ctx.event, Object.keys(ctx.spec.emits))
    },

    /** Target view must exist */
    targetViewExists: {
      code: 'WIRING_TARGET_VIEW_NOT_FOUND',
      validate: (view: string, ctx: ValidationContext) => ctx.views.has(view),
      message: "Wiring target view '{{value}}' not found.",
      suggestions: (ctx) => ctx.findSimilar(ctx.value, Array.from(ctx.views.keys()))
    },

    /** Transform expression must be valid */
    validTransformExpression: {
      code: 'INVALID_TRANSFORM_EXPRESSION',
      validate: (expr: string) => parseExpression(expr).valid,
      message: "Invalid transform expression: {{error}}. Expression: '{{value}}'",
      suggestions: ['Check expression syntax']
    }
  },

  // =========================================================================
  // CIRCULAR DEPENDENCY DETECTION
  // =========================================================================

  dependencies: {
    /** No circular entity references */
    noCircularEntityRefs: {
      code: 'CIRCULAR_ENTITY_REFERENCE',
      validate: (entities: Map<string, EntityTypeConfig>) => {
        // Build dependency graph and detect cycles
        const graph = buildEntityDependencyGraph(entities);
        return !hasCycle(graph);
      },
      message: "Circular reference detected in entity types: {{cycle}}.",
      suggestions: ['Break the cycle by removing one reference']
    },

    /** No circular computed property dependencies */
    noCircularComputed: {
      code: 'CIRCULAR_COMPUTED_DEPENDENCY',
      validate: (entity: EntityTypeConfig) => {
        const graph = buildComputedDependencyGraph(entity);
        return !hasCycle(graph);
      },
      message: "Circular dependency in computed properties: {{cycle}}.",
      suggestions: ['Refactor computed properties to break cycle']
    }
  }
};
```

### 6.3 Example Validation Errors

```typescript
// Example 1: Entity type not found in view
const error1: ProductValidationError = {
  category: 'reference-broken',
  code: 'QUERY_ENTITY_TYPE_NOT_FOUND',
  message: "Query entity type 'parts' not found. Available: part, assembly, material, document. Did you mean 'part'?",
  path: ['views', 'parts-list', 'data', 'queries', 'items', 'entityType'],
  value: 'parts',
  expected: 'Valid entity type ID',
  suggestions: ['part', 'assembly'],
  location: { file: 'views/parts-list.yaml', line: 12, column: 18 }
};

// Example 2: Block type not found
const error2: ProductValidationError = {
  category: 'view-invalid',
  code: 'BLOCK_TYPE_NOT_FOUND',
  message: "Block type 'trellis.datatable' not found. Available: trellis.data-table, trellis.record-view, trellis.form. Did you mean 'trellis.data-table'?",
  path: ['views', 'parts-list', 'layout', 'blocks', '0', 'type'],
  value: 'trellis.datatable',
  expected: 'Valid block type from registry',
  suggestions: ['trellis.data-table'],
  location: { file: 'views/parts-list.yaml', line: 25, column: 12 }
};

// Example 3: Invalid lifecycle transition
const error3: ProductValidationError = {
  category: 'entity-invalid',
  code: 'TRANSITION_STATE_NOT_FOUND',
  message: "Transition references unknown state. From: 'draft', To: 'approved'. Available: draft, in_review, released, obsolete. Did you mean 'released'?",
  path: ['entities', 'part', 'lifecycle', 'transitions', '1', 'to'],
  value: 'approved',
  expected: 'Valid lifecycle state',
  suggestions: ['released', 'in_review'],
  location: { file: 'entities/part.yaml', line: 89, column: 10 }
};

// Example 4: Circular dependency
const error4: ProductValidationError = {
  category: 'circular-dependency',
  code: 'CIRCULAR_ENTITY_REFERENCE',
  message: "Circular reference detected in entity types: part -> assembly -> component -> part",
  path: ['entities'],
  value: ['part', 'assembly', 'component'],
  expected: 'Acyclic entity type graph',
  suggestions: [
    "Remove the 'component' reference from 'assembly'",
    "Remove the 'part' reference from 'component'"
  ],
  location: { file: 'entities/component.yaml', line: 45, column: 8 }
};

// Example 5: Invalid data binding
const error5: ProductValidationError = {
  category: 'view-invalid',
  code: 'INVALID_DATA_BINDING',
  message: "Data binding '$parts.name' references unknown scope 'parts'. Available: part, params, query, user.",
  path: ['views', 'part-detail', 'layout', 'blocks', '0', 'props', 'title'],
  value: '$parts.name',
  expected: 'Valid scope reference',
  suggestions: ['$part.name', '$params.name'],
  location: { file: 'views/part-detail.yaml', line: 32, column: 14 }
};
```

---

## 7. Complete PLM Example

A full Product Lifecycle Management product demonstrating all configuration patterns.

### 7.1 Directory Structure

```
products/plm/
├── product.yaml              # Product manifest
├── entities/
│   ├── part.yaml             # Part entity type
│   ├── assembly.yaml         # Assembly entity type
│   ├── material.yaml         # Material entity type
│   ├── document.yaml         # Document entity type
│   └── supplier.yaml         # Supplier entity type
├── relationships/
│   ├── bom.yaml              # Bill of Materials relationship
│   └── document-link.yaml    # Document linking relationship
├── views/
│   ├── dashboard.yaml        # Dashboard view
│   ├── parts-list.yaml       # Parts list view
│   ├── part-detail.yaml      # Part detail view
│   ├── part-create.yaml      # Part creation form
│   ├── assemblies-list.yaml  # Assemblies list view
│   ├── assembly-detail.yaml  # Assembly detail view
│   ├── documents-list.yaml   # Documents list view
│   └── document-detail.yaml  # Document detail view
├── navigation.yaml           # Navigation configuration
├── wiring.yaml               # Product-level wiring
└── permissions.yaml          # Permission definitions
```

### 7.2 Product Manifest

```yaml
# products/plm/product.yaml

id: plm
version: 2.1.0
name: Product Lifecycle Management
description: |
  Comprehensive PLM solution for managing parts, assemblies,
  bill of materials, and engineering documents throughout
  their lifecycle from design to obsolescence.

extends: trellis.core

features:
  - bom-management
  - document-control
  - change-orders
  - revision-history
  - where-used-analysis
  - cost-rollup

defaultView: dashboard

requires:
  platformVersion: ">=1.0.0"
  blocks:
    - trellis.data-table
    - trellis.record-view
    - trellis.relationship-tree
    - trellis.property-editor
    - trellis.tabs
    - trellis.page-header
    - trellis.dashboard-widget
    - trellis.chart
  entityLibraries:
    - trellis.audit
    - trellis.attachments

settings:
  locale: en-US
  timezone: America/Los_Angeles
  theme:
    primaryColor: "#2563eb"
    colorMode: system
  branding:
    logo: /assets/plm-logo.svg
    favicon: /assets/plm-favicon.ico
    titleTemplate: "{{page}} | PLM"
  analytics:
    enabled: true
    provider: trellis

includes:
  entities: entities/*.yaml
  relationships: relationships/*.yaml
  views: views/**/*.yaml
  permissions: permissions.yaml
```

### 7.3 Entity Types

```yaml
# products/plm/entities/part.yaml

id: part
name: Part
description: A manufactured or purchased component
icon: cube
extends: trellis.auditable

properties:
  - name: part_number
    label: Part Number
    type: text
    required: true
    unique: true
    validation:
      pattern: "^[A-Z]{2}-\\d{6}$"
      patternMessage: "Must be format XX-000000"

  - name: name
    label: Name
    type: text
    required: true
    validation:
      maxLength: 200

  - name: description
    label: Description
    type:
      type: text
      maxLength: 2000
    ui:
      widget: textarea

  - name: revision
    label: Revision
    type: text
    default: "A"
    validation:
      pattern: "^[A-Z]$"

  - name: category
    label: Category
    type:
      type: option
      options:
        - value: mechanical
          label: Mechanical
          color: blue
        - value: electrical
          label: Electrical
          color: yellow
        - value: software
          label: Software
          color: purple

  - name: material
    label: Material
    type:
      type: reference
      entityType: material

  - name: weight
    label: Weight
    type:
      type: number
      dimension: mass
      unit: kg
      min: 0

  - name: unit_cost
    label: Unit Cost
    type:
      type: number
      dimension: currency
      unit: USD
      min: 0

  - name: lead_time_days
    label: Lead Time
    type:
      type: integer
      min: 0

  - name: suppliers
    label: Suppliers
    type:
      type: list
      element:
        type: reference
        entityType: supplier

computed:
  - name: total_bom_cost
    label: Total BOM Cost
    expression: "SUM(@self.bom_children[*].extended_cost)"
    dimension: currency
    unit: USD

lifecycle:
  stateProperty: status
  initialState: draft
  states:
    - value: draft
      label: Draft
      color: gray
      editable: true
      deletable: true
    - value: in_review
      label: In Review
      color: yellow
      editable: false
    - value: released
      label: Released
      color: green
      editable: false
    - value: obsolete
      label: Obsolete
      color: red
      editable: false

  transitions:
    - from: draft
      to: in_review
      action: submit_for_review
      label: Submit for Review
      permission: part.submit

    - from: in_review
      to: released
      action: approve
      label: Approve
      permission: part.approve
      when: "@self.material != null"

    - from: in_review
      to: draft
      action: reject
      label: Reject
      permission: part.approve

    - from: released
      to: obsolete
      action: obsolete
      label: Mark Obsolete
      permission: part.obsolete

ui:
  displayProperty: name
  listProperties: [part_number, name, revision, status, category]
  searchProperties: [part_number, name, description]
  groups:
    - name: identification
      label: Identification
      properties: [part_number, name, description, revision, category]
    - name: physical
      label: Physical Properties
      properties: [material, weight]
    - name: commercial
      label: Commercial
      properties: [unit_cost, lead_time_days, suppliers]
```

```yaml
# products/plm/entities/assembly.yaml

id: assembly
name: Assembly
description: A collection of parts and sub-assemblies
icon: layers
extends: part

properties:
  - name: assembly_type
    label: Assembly Type
    type:
      type: option
      options:
        - value: top_level
          label: Top-Level Assembly
        - value: sub_assembly
          label: Sub-Assembly
        - value: kit
          label: Kit

computed:
  - name: part_count
    label: Part Count
    expression: "COUNT(@self.descendants[*])"

  - name: total_weight
    label: Total Weight
    expression: "SUM(@self.bom_children[*].weight)"
    dimension: mass
    unit: kg
```

```yaml
# products/plm/entities/material.yaml

id: material
name: Material
description: Raw material or substance
icon: flask

properties:
  - name: material_code
    label: Material Code
    type: text
    required: true
    unique: true

  - name: name
    label: Name
    type: text
    required: true

  - name: material_type
    label: Type
    type:
      type: option
      options:
        - value: metal
          label: Metal
        - value: plastic
          label: Plastic
        - value: composite
          label: Composite
        - value: ceramic
          label: Ceramic

  - name: density
    label: Density
    type:
      type: number
      dimension: density
      unit: kg/m3

  - name: cost_per_kg
    label: Cost per kg
    type:
      type: number
      dimension: currency
      unit: USD

ui:
  displayProperty: name
  listProperties: [material_code, name, material_type, density]
```

### 7.4 Relationships

```yaml
# products/plm/relationships/bom.yaml

id: bom_contains
name: Bill of Materials
description: Defines what parts/assemblies are contained in a parent assembly

from_types: [assembly]
to_types: [part, assembly]
cardinality: one_to_many
bidirectional: true
inverse_type: contained_in

metadata:
  quantity:
    type: integer
    required: true
    default: 1
    min: 1

  reference_designator:
    type: text
    description: "Reference on drawing (e.g., R1, C5)"

  find_number:
    type: integer
    description: "Position in BOM"

  notes:
    type: text
```

### 7.5 Views (Parts List)

```yaml
# products/plm/views/parts-list.yaml

id: parts-list
name: Parts
route: /parts

data:
  query:
    status:
      type: string
      enum: [draft, in_review, released, obsolete]
    category:
      type: string
    search:
      type: string

layout:
  type: single
  block:
    type: trellis.page-layout
    props:
      title: Parts
      subtitle: Manage all parts in the system
    slots:
      actions:
        - type: trellis.button
          props:
            label: New Part
            icon: plus
            variant: primary
            action: navigate
            params:
              view: part-create
          showWhen: $can('part.create')

      content:
        - type: trellis.data-table
          id: parts-table
          props:
            entityType: part
            columns:
              - property: part_number
                label: Part #
                width: 150
                sortable: true
              - property: name
                label: Name
                sortable: true
              - property: revision
                label: Rev
                width: 60
              - property: status
                label: Status
                width: 120
              - property: category
                label: Category
                width: 120
              - property: unit_cost
                label: Unit Cost
                width: 100
                format: currency
              - property: updated_at
                label: Modified
                width: 150
                format: relative
            selectable: true
            searchable: true
            pageSize: 25

wiring:
  - from: parts-table
    event: rowSelected
    to: $navigate
    receiver: push
    transform:
      kind: expression
      expr: "{ path: '/parts/' + payload.entityId }"
```

### 7.6 Navigation

```yaml
# products/plm/navigation.yaml

navigation:
  sections:
    - items:
        - id: dashboard
          label: Dashboard
          icon: home
          view: dashboard

    - label: Parts Management
      collapsible: true
      items:
        - id: parts
          label: Parts
          icon: cube
          view: parts-list
          badge:
            type: count
            query:
              entityType: part
              filter: "#status == 'in_review'"
            color: warning

        - id: assemblies
          label: Assemblies
          icon: layers
          view: assemblies-list

        - id: materials
          label: Materials
          icon: flask
          view: materials-list

    - label: Documents
      collapsible: true
      items:
        - id: documents
          label: All Documents
          icon: file
          view: documents-list

  quickActions:
    - id: new-part
      label: New Part
      icon: plus
      shortcut: Ctrl+Shift+P
      action:
        type: create
        entityType: part

    - id: search
      label: Search
      icon: search
      shortcut: Ctrl+K
      action:
        type: search

  search:
    shortcut: Ctrl+K
    placeholder: Search parts, assemblies, documents...
    entityTypes:
      - entityType: part
        searchProperties: [part_number, name]
        displayProperties: [part_number, name, status]
        targetView: part-detail

      - entityType: document
        searchProperties: [document_number, name]
        displayProperties: [document_number, name]
        targetView: document-detail
```

---

## 8. Open Questions & Recommendations

### Question 1: Should entity type definitions live in product YAML or separate files?

**Options:**
- **A) Inline in product.yaml** - Everything in one file
- **B) Separate files** - `/entities/part.yaml`, imported via `includes`
- **C) Both** - Inline for simple, files for complex

**Recommendation: Option C (Both)**

**Rationale:**
- **Separate files** for entities with >10 properties, lifecycle, computed properties
  - Better for reviewing changes (PRs show focused diffs)
  - Hot-reload (change one entity, reload one file)
  - Team collaboration (less merge conflicts)
  - Reuse across products

- **Inline** for simple entities (<5 properties, no lifecycle)
  - Reduces file proliferation for trivial types

**Implementation:**
```yaml
# product.yaml - inline simple entities
entities:
  tag:
    name: Tag
    properties:
      - name: name
        type: text

# Separate files for complex entities
includes:
  entities: entities/*.yaml
```

---

### Question 2: How do views bind to data?

**Implementation:**

```yaml
# Route params: /parts/:entityId
data:
  params:
    entityId:
      type: entityId
      entityType: part
      fetch: true      # Load entity at route match
      as: part         # Available as $part in scope

# Query params: /parts?status=active&page=1
data:
  query:
    status:
      type: string
      default: active
    page:
      type: number
      default: 1
```

**Scope availability:**
- `$params` - Raw route parameters
- `$query` - Query parameters
- `$part` (or `$<as>`) - Fetched entity
- `$user` - Current user context
- `$route` - Full route info

**Binding in blocks:**
```yaml
props:
  title: $part.name                    # Direct property
  subtitle: "${part.part_number}"      # Template
  entityId: $params.entityId           # Raw param
```

---

### Question 3: How do products extend other products?

**Implementation:**

```yaml
# child-product.yaml
id: plm-aerospace
extends: plm

# Add features
features:
  - as9100-compliance

# Override settings
settings:
  theme:
    primaryColor: "#1e3a5f"

# Extend entity with _extends: true
entities:
  part:
    _extends: true  # Merge, don't replace
    properties:
      - name: itar_controlled
        type: boolean
```

**Merge rules:**
| Section | Default | With `_extends: true` |
|---------|---------|----------------------|
| `entities` | Replace | Merge properties |
| `views` | Replace | Merge blocks |
| `settings` | Deep merge | Deep merge |
| `features` | Concat | Concat |

**Conflict resolution:** Extension wins over base.

---

## Summary

This specification defines:

| Component | Purpose |
|-----------|---------|
| **Product Manifest** | Entry point with metadata, features, dependencies |
| **Entity Types** | Data model with properties, lifecycle, computed values |
| **Views** | UI layouts with blocks, data binding, permissions |
| **Navigation** | Sidebar, breadcrumbs, search, quick actions |
| **Product Wiring** | Cross-view navigation, global handlers |
| **Validation** | Comprehensive rules with helpful errors |

**Key principles:**
1. **YAML-first** - Products are configuration, not code
2. **Composable** - Extend, import, override at every level
3. **Validated** - All references checked at load time
4. **AI-friendly** - Error messages Claude Code can act on
5. **Hot-reloadable** - Granular file watching in development