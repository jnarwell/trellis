# ADR-008: Products as YAML Configuration

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis is a platform for building enterprise tools. "Products" are specific applications (PLM, CRM, Test Management) built on the Trellis kernel. We need a way to:
- Define entity types and their properties
- Configure views and layouts
- Wire blocks together
- Set up workflows and automations
- Deploy without code changes

## Decision Drivers

- Business users should configure, not code
- Changes should be reviewable (git-friendly)
- Products should be version-controlled
- Hot-reload for rapid iteration
- Validation before deployment

## Considered Options

1. **YAML configuration files** - Human-readable, git-friendly
2. **JSON configuration** - Machine-friendly, verbose
3. **Database-only configuration** - UI-driven
4. **DSL (Domain Specific Language)** - Custom syntax
5. **Code-based (TypeScript)** - Full programming power

## Decision

Products are defined as **YAML configuration files** organized in a standard directory structure:

```
products/
├── plm/
│   ├── product.yaml           # Product metadata
│   ├── entities/
│   │   ├── part.yaml
│   │   ├── assembly.yaml
│   │   └── document.yaml
│   ├── relationships/
│   │   ├── bom.yaml
│   │   └── document-link.yaml
│   ├── views/
│   │   ├── part-list.yaml
│   │   ├── part-detail.yaml
│   │   └── bom-explorer.yaml
│   ├── workflows/
│   │   └── approval.yaml
│   └── permissions/
│       └── roles.yaml
└── crm/
    └── ...
```

### Product Manifest

```yaml
# products/plm/product.yaml
id: plm
name: Product Lifecycle Management
version: 2.1.0
description: Manage parts, assemblies, and engineering documents

extends: trellis.core  # Optional base product

features:
  - bom-management
  - document-control
  - change-orders

default_view: part-list

navigation:
  - label: Parts
    icon: cube
    view: part-list
  - label: Assemblies
    icon: layers
    view: assembly-list
  - label: Documents
    icon: file-text
    view: document-list
```

### Entity Type Definition

```yaml
# products/plm/entities/part.yaml
id: part
name: Part
description: A manufactured or purchased component
icon: cube

properties:
  - name: partNumber
    type: string
    required: true
    unique: true
    label: Part Number
    validation:
      pattern: "^[A-Z]{2}-\\d{6}$"
      message: "Must be format XX-000000"

  - name: name
    type: string
    required: true
    label: Name

  - name: weight
    type: number
    dimension: physical
    unit: kg
    label: Weight

  - name: unitCost
    type: number
    dimension: currency
    currency: USD
    label: Unit Cost

  - name: totalCost
    type: expression
    expression: "#unitCost * #quantity"
    dimension: currency
    currency: USD
    label: Total Cost

  - name: status
    type: option
    options:
      - value: draft
        label: Draft
        color: gray
      - value: active
        label: Active
        color: green
      - value: obsolete
        label: Obsolete
        color: red
    default: draft

lifecycle:
  states: [draft, in_review, released, obsolete]
  transitions:
    - from: draft
      to: in_review
      action: submit_for_review
    - from: in_review
      to: released
      action: approve
    - from: in_review
      to: draft
      action: reject
    - from: released
      to: obsolete
      action: obsolete
```

### View Definition

```yaml
# products/plm/views/part-detail.yaml
id: part-detail
name: Part Detail
description: Detailed view of a single part
route: /parts/:entityId

layout:
  type: split
  direction: horizontal
  sizes: [60, 40]

  panels:
    - blocks:
        - type: trellis.header
          props:
            title: $entity.name
            subtitle: $entity.partNumber
            status: $entity.status

        - type: trellis.property-editor
          id: props
          props:
            entityId: $route.entityId
            sections:
              - label: Identification
                properties: [partNumber, name, description]
              - label: Physical
                properties: [weight, material, finish]
              - label: Cost
                properties: [unitCost, quantity, totalCost]

    - blocks:
        - type: trellis.tabs
          tabs:
            - label: BOM
              block:
                type: trellis.relationship-tree
                id: bom
                props:
                  entityId: $route.entityId
                  relationshipType: bom_contains
                  direction: children

            - label: Where Used
              block:
                type: trellis.relationship-tree
                props:
                  entityId: $route.entityId
                  relationshipType: bom_contains
                  direction: parents

            - label: Documents
              block:
                type: trellis.relationship-list
                props:
                  entityId: $route.entityId
                  relationshipType: document_link

wiring:
  - source: bom.nodeSelected
    target: navigate
    params:
      view: part-detail
      entityId: $event.entityId
```

### Consequences

**Positive:**
- Human-readable, easy to review in PRs
- Git-friendly (merge, diff, blame)
- Can validate schema before deployment
- Hot-reload during development
- No compilation step

**Negative:**
- YAML syntax errors can be cryptic
- Limited expressiveness vs. code
- Schema validation tooling needed
- Large products = many files

**Neutral:**
- Can generate YAML from UI in future
- Products can be stored in DB after parsing

## Implementation Notes

**Loading products:**
```typescript
async function loadProduct(productPath: string): Promise<Product> {
  const manifest = await loadYaml(`${productPath}/product.yaml`);

  const entities = await loadDirectory(`${productPath}/entities`);
  const views = await loadDirectory(`${productPath}/views`);
  const workflows = await loadDirectory(`${productPath}/workflows`);

  return validateAndMerge(manifest, { entities, views, workflows });
}
```

**Hot reload in development:**
```typescript
if (isDevelopment) {
  chokidar.watch('products/**/*.yaml').on('change', async (path) => {
    const product = extractProductFromPath(path);
    await reloadProduct(product);
    broadcastReload(product);
  });
}
```

## References

- [ADR-007: Blocks with Specs](./007-blocks-specs.md)
- [Kubernetes manifests](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/) (inspiration)
