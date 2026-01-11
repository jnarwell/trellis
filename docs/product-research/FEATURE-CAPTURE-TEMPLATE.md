# Feature Capture Template

> Fill this out, get a draft YAML product.

**Domain:** `[e.g., PLM, CRM, Test Management]`
**Researcher:** `[name]`
**Date:** `[YYYY-MM-DD]`
**Status:** `[Draft | In Review | Complete]`

---

## 1. Market Overview

### 1.1 Domain Definition

**What problem does this software category solve?**
```
[2-3 sentences describing the core problem space]
```

**Who are the primary users?**
| Persona | Role | Key Needs |
|---------|------|-----------|
| | | |
| | | |
| | | |

### 1.2 Key Players

| Tier | Competitor | Target Market | Pricing Model |
|------|------------|---------------|---------------|
| Leader | | | |
| Leader | | | |
| Challenger | | | |
| Challenger | | | |
| Niche | | | |

### 1.3 Market Dynamics

**Why do customers switch tools?**
-
-
-

**What keeps customers locked in?**
-
-
-

---

## 2. Core Entities

> These become `entities/*.yaml` files in your Trellis product.

### Entity Map

```
┌─────────────┐     ┌─────────────┐
│  Entity A   │────▶│  Entity B   │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Entity C   │
└─────────────┘
```

### 2.1 Entity: `[name]`

**Description:** [What this entity represents]

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| | `text` | Yes | |
| | `number` | No | |
| | `option` | Yes | Values: draft, active, archived |
| | `reference` | No | References: [other entity] |
| | `datetime` | No | |

**Computed Properties:**
| Property | Expression | Description |
|----------|------------|-------------|
| | `IF(@self.x > 0, ...)` | |
| | `SUM(...)` | |

**Lifecycle States:**
| State | Editable | Deletable | Color |
|-------|----------|-----------|-------|
| draft | Yes | Yes | gray |
| active | Yes | No | green |
| archived | No | No | red |

**Transitions:**
| From | To | Action | Condition |
|------|-----|--------|-----------|
| draft | active | activate | `@self.name != null` |
| active | archived | archive | |

---

*Copy the Entity section above for each entity you identify.*

---

## 3. Relationships

> These become `relationships/*.yaml` or relationship definitions within entities.

| Relationship | From | To | Cardinality | Hierarchical | Notes |
|--------------|------|-----|-------------|--------------|-------|
| contains | Assembly | Part | one_to_many | Yes | BOM structure |
| belongs_to | Product | Category | many_to_one | No | |
| linked_to | Part | Document | many_to_many | No | |

---

## 4. Feature Analysis

### 4.1 Killer Features (by competitor)

> Features that make customers choose this specific tool.

| Competitor | Feature | Why It Works | Trellis Implementation |
|------------|---------|--------------|------------------------|
| | | | Property: / Computed: / Relationship: / View: |
| | | | |
| | | | |

### 4.2 Table Stakes

> Must have to be considered. Don't differentiate, but absence disqualifies.

| Feature | Why Required | Trellis Implementation |
|---------|--------------|------------------------|
| | | |
| | | |
| | | |

### 4.3 Differentiators

> Nice-to-have features that could set Trellis apart.

| Feature | Who Has It | Our Advantage | Priority |
|---------|-----------|---------------|----------|
| | | | High/Med/Low |
| | | | |

### 4.4 Common Complaints (from reviews)

> G2/Capterra/TrustRadius review mining.

| Pain Point | Frequency | Source | Trellis Solution |
|------------|-----------|--------|------------------|
| | High/Med/Low | G2, Capterra | |
| | | | |
| | | | |

### 4.5 Anti-Patterns

> Features everyone hates. What NOT to build.

| Anti-Pattern | Why It Fails | Trellis Approach |
|--------------|--------------|------------------|
| | | |
| | | |

---

## 5. UX Patterns

### 5.1 Navigation

| Pattern | Used By | Notes |
|---------|---------|-------|
| Sidebar + Tabs | Most | Standard, works well |
| Mega-menu | | |
| Breadcrumb hierarchy | | For nested entities |

### 5.2 List/Table Views

| Pattern | When Used | Trellis Block |
|---------|-----------|---------------|
| Data table with filters | Primary lists | `trellis.data-table` |
| Kanban board | Status workflows | `trellis.kanban` |
| Card grid | Visual items | `trellis.card-grid` |

### 5.3 Detail Views

| Pattern | When Used | Trellis Block |
|---------|-----------|---------------|
| Tabbed sections | Complex entities | `trellis.tabs` |
| Sidebar panel | Quick edit | `trellis.panel` |
| Full page form | Creation flows | `trellis.property-editor` |

### 5.4 Common Widgets

| Widget | Purpose | Trellis Equivalent |
|--------|---------|-------------------|
| | | |
| | | |

---

## 6. Workflows

### 6.1 Core Business Processes

**Workflow: `[name]`**
```
[Step 1] ──▶ [Step 2] ──▶ [Step 3]
                │
                ▼
            [Branch]
```

**Mapped to Trellis:**
- Entity:
- State property:
- Transitions:

---

*Repeat for each major workflow.*

---

## 7. Gap Analysis

### 7.1 What No One Does Well

| Gap | Why It's Hard | Trellis Opportunity |
|-----|---------------|---------------------|
| | | |
| | | |

### 7.2 Quick Wins

> Can implement in Phase 1 with high impact.

| Opportunity | Effort | Impact | Notes |
|-------------|--------|--------|-------|
| | Low | High | |
| | | | |

### 7.3 Long-Term Advantages

> Harder to build but sustainable differentiation.

| Opportunity | Why Sustainable | Dependencies |
|-------------|-----------------|--------------|
| | | |
| | | |

---

## 8. Draft YAML Output

> Transform your research into Trellis product configuration.

### 8.1 Product Manifest

```yaml
# products/[domain]/product.yaml
id: [domain-id]
version: 1.0.0
name: [Product Name]
description: |
  [Description from Section 1]

defaultView: [main-list-view]

features:
  - [feature-1]
  - [feature-2]

requires:
  platformVersion: ">=1.0.0"
  blocks:
    - trellis.data-table
    - trellis.page-layout
    - trellis.property-editor
    # Add based on Section 5

settings:
  locale: en-US
  theme:
    primaryColor: "#2563eb"

includes:
  entities: entities/*.yaml
  views: views/*.yaml
  navigation: navigation.yaml
```

### 8.2 Entity Definitions

```yaml
# products/[domain]/entities/[entity-name].yaml
id: [entity-id]
name: [Entity Name]
description: [From Section 2]
icon: [icon-name]

properties:
  # Copy from Section 2 Entity tables
  - name: [property_name]
    label: [Label]
    type: [type]
    required: [true/false]
    # Add validation, ui hints as needed

computed:
  # Copy from Section 2 Computed Properties
  - name: [computed_name]
    label: [Label]
    expression: "[expression]"

lifecycle:
  stateProperty: status
  initialState: draft

  states:
    # Copy from Section 2 Lifecycle States
    - value: draft
      label: Draft
      color: gray
      editable: true
      deletable: true

  transitions:
    # Copy from Section 2 Transitions
    - from: draft
      to: active
      action: activate
      label: Activate
      when: "[condition]"

ui:
  displayProperty: name
  listProperties: [prop1, prop2, prop3]
  searchProperties: [name, description]
```

### 8.3 Relationship Definitions

```yaml
# products/[domain]/relationships/[relationship].yaml
id: [relationship-id]
name: [Relationship Name]
description: [What it represents]

from:
  entityType: [source-entity]
to:
  entityType: [target-entity]

cardinality: [one_to_one | one_to_many | many_to_one | many_to_many]
hierarchical: [true/false]

# If bidirectional
inverse:
  id: [inverse-relationship-id]
  name: [Inverse Name]
```

---

## 9. Research Sources

### 9.1 Competitor Materials

| Competitor | Source Type | URL/Notes |
|------------|-------------|-----------|
| | Website | |
| | Documentation | |
| | Demo video | |
| | Pricing page | |

### 9.2 Review Analysis

| Source | Reviews Analyzed | Key Findings |
|--------|------------------|--------------|
| G2 | [count] | |
| Capterra | [count] | |
| TrustRadius | [count] | |

### 9.3 Other Sources

| Source | Notes |
|--------|-------|
| YouTube demos | |
| Reddit/forums | |
| Job postings | |
| Case studies | |

---

## Completion Checklist

- [ ] All major competitors analyzed (5-7)
- [ ] Core entities identified with properties
- [ ] Relationships mapped
- [ ] Table stakes features listed
- [ ] Killer features captured
- [ ] Pain points documented
- [ ] Anti-patterns identified
- [ ] Draft YAML validated against Trellis schema
- [ ] Gap analysis complete
- [ ] Sources documented
