# Feature Capture to YAML Guide

How to convert competitive research into a working Trellis product.

## Overview

The research-to-product pipeline:

```
┌─────────────────────┐
│  Domain Research    │  Competitive analysis
│  (Web research)     │  Review mining
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Feature Capture    │  Structured document
│  (Template)         │  docs/product-research/captures/
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  YAML Generator     │  Skill-guided generation
│  (Skill)            │  Mapping rules applied
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Draft Product      │  products/[name]/
│  (YAML files)       │  Entities, views, nav
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Customization      │  Manual refinement
│  (Manual)           │  Domain-specific tuning
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validation & Test  │  trellis validate
│  (CLI)              │  trellis serve
└─────────────────────┘
```

## Step-by-Step Process

### Step 1: Complete Feature Capture

Use the Feature Capture template to research the domain:

```
docs/product-research/FEATURE-CAPTURE-TEMPLATE.md
```

Save your completed capture to:
```
docs/product-research/captures/[domain]-capture.md
```

**Required sections for YAML generation:**
- Section 2: Core Entities (with properties, computed, lifecycle)
- Section 3: Relationships
- Section 5: UX Patterns (for view selection)

### Step 2: Invoke the Generator

Ask Claude to generate YAML from your capture:

```
Generate a Trellis YAML product from the [domain] feature capture.
Name it '[product-id]'.
```

**With specific focus:**
```
Generate a Trellis YAML product from the PLM feature capture.
Name it 'acme-plm'.
Focus on Part and BOM entities first.
Use table views for all lists.
```

### Step 3: Review Draft Output

The generator creates:

```
products/[name]/
├── product.yaml          # Manifest
├── entities/
│   ├── [entity1].yaml
│   └── [entity2].yaml
├── views/
│   ├── dashboard.yaml
│   ├── [entity1]-list.yaml
│   ├── [entity1]-detail.yaml
│   ├── [entity1]-form.yaml
│   └── ...
└── navigation.yaml
```

Review each file for:
- Correct property types
- Valid expression syntax
- Complete lifecycle states
- Appropriate view layouts

### Step 4: Customize

Common customizations:

**Entity refinements:**
- Add validation rules
- Tune UI widgets
- Add indexes for performance
- Refine property groups

**View refinements:**
- Adjust column widths
- Add conditional visibility
- Customize action buttons
- Add wiring for complex interactions

**Navigation refinements:**
- Reorder items
- Add badges
- Configure quick actions
- Tune global search

### Step 5: Validate and Test

```bash
# Validate YAML syntax and references
trellis validate ./products/[name]

# Dry-run to check against schema
trellis load ./products/[name] --dry-run

# Start development server
trellis serve ./products/[name]
```

## Quick Reference

### Type Mapping

| Feature Capture | YAML Type |
|-----------------|-----------|
| `text` | `type: text` |
| `number` | `type: number` |
| `currency` | `type: { type: number, dimension: currency }` |
| `date` | `type: { type: datetime, format: date }` |
| `option` with values | `type: { type: option, options: [...] }` |
| `reference` to Entity | `type: { type: reference, entityType: [...] }` |

### Expression Patterns

| Business Need | Expression |
|---------------|------------|
| Sum children | `SUM(@self.items[*].price)` |
| Count related | `COUNT(@self.items[*])` |
| Percentage | `IF(@self.total > 0, @self.part / @self.total * 100, 0)` |
| Status text | `IF(@self.qty <= 0, 'Out', IF(@self.qty < 10, 'Low', 'OK'))` |
| Default value | `COALESCE(@self.override, @self.default, 0)` |

### View Patterns

| UX Need | View Type |
|---------|-----------|
| List all entities | `trellis.data-table` in list view |
| View single entity | `trellis.property-editor` (readOnly) in detail view |
| Edit entity | `trellis.property-editor` (mode: edit) in form view |
| Dashboard stats | `trellis.dashboard-widget` with count queries |
| Status workflow | `trellis.kanban` board |

## Tips

### Start Small

- Begin with 3-5 core entities
- Add supporting entities later
- Expand views as needed

### Focus on Table Stakes

- Get basic CRUD working first
- Add killer features after validation
- Defer nice-to-haves

### Use Computed Properties

- Replace manual calculations
- Ensure data consistency
- Enable computed rollups

### Iterate on Views

- Start with generated defaults
- Tune based on user feedback
- Add complex wiring incrementally

## Troubleshooting

### Invalid Expression Syntax

**Wrong:**
```yaml
expression: "self.price * self.quantity"  # Missing @
expression: "sum(@self.items[*].price)"   # Lowercase function
expression: "$self.price"                  # Wrong prefix
```

**Correct:**
```yaml
expression: "@self.price * @self.quantity"
expression: "SUM(@self.items[*].price)"
expression: "#price * #quantity"           # Shorthand OK
```

### Missing Entity Reference

If you get "unknown entity type" errors:

1. Check entity file exists in `entities/`
2. Check entity `id` matches reference
3. Check for typos in `entityType` values

### Lifecycle Transition Errors

If transitions fail validation:

1. Ensure `from` and `to` match state `value` fields
2. Ensure `when` conditions use Expression Engine syntax
3. Ensure all states referenced in transitions are defined

## Related Resources

| Resource | Path |
|----------|------|
| Feature Capture Template | `docs/product-research/FEATURE-CAPTURE-TEMPLATE.md` |
| Research Guide | `docs/product-research/RESEARCH-GUIDE.md` |
| YAML Generator Skill | `.claude/plugins/orchestration/skills/yaml-generator.md` |
| Expression Reference | `specs/config/EXPRESSION-QUICK-REF.md` |
| Example Product | `products/plm-demo/` |
