# Feature Capture: PLM (Product Lifecycle Management)

> Research conducted January 2025

**Domain:** PLM (Product Lifecycle Management)
**Researcher:** Claude (Instance 27)
**Date:** 2025-01-11
**Status:** Complete

---

## 1. Market Overview

### 1.1 Domain Definition

**What problem does this software category solve?**
```
PLM software manages the entire lifecycle of a product from conception through
design, manufacturing, service, and disposal. It centralizes product data (BOMs,
CAD files, documents), controls engineering changes, and ensures all stakeholders
work from a single source of truth.
```

**Who are the primary users?**
| Persona | Role | Key Needs |
|---------|------|-----------|
| Design Engineer | Creates and modifies product designs | BOM management, CAD integration, revision control |
| Manufacturing Engineer | Prepares products for production | MBOM, work instructions, process planning |
| Quality Manager | Ensures compliance and standards | Change control, audit trails, document control |
| Product Manager | Oversees product strategy | Visibility into status, milestone tracking |
| Procurement | Sources components | AML (Approved Manufacturer List), supplier data |

### 1.2 Key Players

| Tier | Competitor | Target Market | Pricing Model |
|------|------------|---------------|---------------|
| Leader | Siemens Teamcenter | Enterprise (aerospace, auto) | Per-seat, $10K+ annually |
| Leader | PTC Windchill | Enterprise (regulated industries) | Per-seat, $8K+ annually |
| Challenger | Arena PLM | Mid-market electronics/medical | Per-seat, $3K+ annually |
| Challenger | Propel PLM | SMB (Salesforce users) | Per-seat, SaaS |
| Niche | OpenBOM | SMB/startups | $25-375/seat/month |
| Niche | Autodesk Fusion Manage | Autodesk ecosystem | Per-seat, SaaS |

### 1.3 Market Dynamics

**Why do customers switch tools?**
- Legacy PLM too complex, steep learning curve
- High total cost of ownership (licenses + implementation)
- Poor cloud/mobile experience
- Lack of integration with modern CAD tools
- Slow performance with large assemblies

**What keeps customers locked in?**
- Years of product data in the system
- Training investment across organization
- Compliance audit trails depend on it
- Integration with ERP and manufacturing systems
- Customizations and workflows built over years

---

## 2. Core Entities

### Entity Map

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Part     │────▶│     BOM     │◀────│  Assembly   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  Supplier   │     │   Change    │
└─────────────┘     │    Order    │
       │            └─────────────┘
       ▼                   │
┌─────────────┐            ▼
│    AML      │     ┌─────────────┐
│  (Approved  │     │  Document   │
│ Mfr List)   │     └─────────────┘
└─────────────┘
```

### 2.1 Entity: `part`

**Description:** A component or raw material used in product assemblies. The fundamental building block of BOMs.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| part_number | `text` | Yes | Unique identifier (e.g., "PN-001234") |
| name | `text` | Yes | Human-readable name |
| description | `text` | No | Detailed description |
| revision | `text` | Yes | Current revision (e.g., "A", "B", "01") |
| category | `reference` | No | References: category |
| status | `option` | Yes | Values: draft, released, obsolete |
| unit_of_measure | `option` | Yes | Values: each, kg, m, L |
| weight | `number` | No | Dimension: mass, unit: kg |
| material | `text` | No | Material specification |
| make_buy | `option` | Yes | Values: make, buy |
| lead_time_days | `number` | No | Procurement lead time |
| unit_cost | `number` | No | Dimension: currency, unit: USD |
| rohs_compliant | `boolean` | No | RoHS compliance status |
| datasheet_url | `text` | No | Link to component datasheet |

**Computed Properties:**
| Property | Expression | Description |
|----------|------------|-------------|
| display_name | `CONCAT(@self.part_number, ' - ', @self.name)` | Combined identifier |
| is_active | `@self.status == 'released'` | Quick check for usability |

**Lifecycle States:**
| State | Editable | Deletable | Color |
|-------|----------|-----------|-------|
| draft | Yes | Yes | gray |
| in_review | No | No | yellow |
| released | No | No | green |
| obsolete | No | No | red |

**Transitions:**
| From | To | Action | Condition |
|------|-----|--------|-----------|
| draft | in_review | submit_for_review | `@self.part_number != null && @self.name != null` |
| in_review | released | release | Requires approval |
| in_review | draft | reject | |
| released | obsolete | obsolete | Creates ECO |

### 2.2 Entity: `assembly`

**Description:** A product or sub-assembly composed of parts and other assemblies.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| assembly_number | `text` | Yes | Unique identifier |
| name | `text` | Yes | Human-readable name |
| description | `text` | No | |
| revision | `text` | Yes | Current revision |
| status | `option` | Yes | Values: draft, released, obsolete |
| bom_level | `number` | No | Hierarchy depth (0 = top-level) |
| total_parts_count | `number` | No | Computed: count of all parts |

**Computed Properties:**
| Property | Expression | Description |
|----------|------------|-------------|
| total_cost | `SUM(#bom_items.extended_cost)` | Rolled-up cost from BOM |
| total_weight | `SUM(#bom_items.extended_weight)` | Rolled-up weight |

**Lifecycle:** Same as Part

### 2.3 Entity: `bom_item`

**Description:** A line item in a Bill of Materials linking a parent to a child component.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| parent | `reference` | Yes | References: assembly |
| child | `reference` | Yes | References: part or assembly |
| quantity | `number` | Yes | How many needed |
| find_number | `text` | No | Position identifier on drawing |
| reference_designator | `text` | No | For electronics (e.g., "R1, R2, R3") |
| notes | `text` | No | Assembly notes |

**Computed Properties:**
| Property | Expression | Description |
|----------|------------|-------------|
| extended_cost | `@self.quantity * #child.unit_cost` | Line total cost |
| extended_weight | `@self.quantity * #child.weight` | Line total weight |

### 2.4 Entity: `change_order`

**Description:** Engineering Change Order (ECO) tracking modifications to released items.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| eco_number | `text` | Yes | Auto-generated (e.g., "ECO-2025-0042") |
| title | `text` | Yes | Brief summary |
| description | `text` | Yes | Detailed change description |
| reason | `option` | Yes | Values: design_improvement, cost_reduction, defect_fix, compliance, customer_request |
| priority | `option` | Yes | Values: low, medium, high, critical |
| status | `option` | Yes | Values: draft, submitted, in_review, approved, rejected, implemented |
| requestor | `reference` | Yes | References: user |
| approvers | `list` | No | List of user references |
| affected_items | `list` | Yes | References to parts/assemblies |
| implementation_date | `datetime` | No | When change takes effect |
| cost_impact | `number` | No | Dimension: currency |

**Lifecycle States:**
| State | Editable | Deletable | Color |
|-------|----------|-----------|-------|
| draft | Yes | Yes | gray |
| submitted | No | No | blue |
| in_review | No | No | yellow |
| approved | No | No | green |
| rejected | No | No | red |
| implemented | No | No | purple |

**Transitions:**
| From | To | Action | Condition |
|------|-----|--------|-----------|
| draft | submitted | submit | `COUNT(@self.affected_items) > 0` |
| submitted | in_review | start_review | |
| in_review | approved | approve | Requires all approver signatures |
| in_review | rejected | reject | |
| approved | implemented | implement | |

### 2.5 Entity: `document`

**Description:** Engineering documents, drawings, specifications, and attachments.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| document_number | `text` | Yes | Unique identifier |
| title | `text` | Yes | |
| document_type | `option` | Yes | Values: drawing, specification, datasheet, procedure, manual |
| revision | `text` | Yes | |
| status | `option` | Yes | Values: draft, released, obsolete |
| file_format | `option` | No | Values: pdf, dwg, step, sldprt |
| file_size_kb | `number` | No | |

### 2.6 Entity: `supplier`

**Description:** Approved vendors and manufacturers.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| name | `text` | Yes | Company name |
| code | `text` | Yes | Short code (e.g., "ACME") |
| status | `option` | Yes | Values: pending, approved, on_hold, disqualified |
| contact_name | `text` | No | |
| contact_email | `text` | No | |
| lead_time_days | `number` | No | Typical lead time |
| country | `text` | No | |
| quality_rating | `number` | No | 1-5 rating |

### 2.7 Entity: `aml_entry`

**Description:** Approved Manufacturer List entry - which suppliers can provide which parts.

**Properties:**
| Property | Type | Required | Notes |
|----------|------|----------|-------|
| part | `reference` | Yes | References: part |
| supplier | `reference` | Yes | References: supplier |
| manufacturer_part_number | `text` | Yes | Supplier's part number |
| status | `option` | Yes | Values: pending, approved, rejected |
| unit_price | `number` | No | Quoted price |
| min_order_qty | `number` | No | Minimum order quantity |

---

## 3. Relationships

| Relationship | From | To | Cardinality | Hierarchical | Notes |
|--------------|------|-----|-------------|--------------|-------|
| contains | assembly | part/assembly | one_to_many | Yes | BOM structure |
| linked_to | part/assembly | document | many_to_many | No | Documentation |
| supplied_by | part | supplier | many_to_many | No | Via AML entries |
| affected_by | part/assembly | change_order | many_to_many | No | ECO tracking |
| belongs_to | part | category | many_to_one | No | Classification |
| supersedes | part | part | one_to_one | No | Replacement tracking |

---

## 4. Feature Analysis

### 4.1 Killer Features (by competitor)

| Competitor | Feature | Why It Works | Trellis Implementation |
|------------|---------|--------------|------------------------|
| Arena PLM | Supply Chain Intelligence (SCI) | Proactively monitors BOM health for component risks | Computed: risk_score based on supplier data + integrations |
| Arena PLM | Training records tied to items | Compliance requirement for medical devices | Relationship: requires_training, entity: training_record |
| Propel PLM | Native Salesforce integration | Sales and engineering in one platform | API: sync with external CRM |
| Propel PLM | PIM + PLM + QMS unified | No context switching | Single product covering all |
| OpenBOM | Spreadsheet-like interface | Familiar to engineers | View: trellis.data-table with inline edit |
| OpenBOM | Real-time multi-user editing | Google Docs for BOMs | WebSocket: live collaboration |
| Teamcenter | Requirements traceability | Link features to requirements | Relationship: traces_to, entity: requirement |
| Windchill | Built-in ECR/ECO/ECN workflow | Compliance-ready change mgmt | Lifecycle: multi-stage with approvals |

### 4.2 Table Stakes

| Feature | Why Required | Trellis Implementation |
|---------|--------------|------------------------|
| Multi-level BOM | Products have sub-assemblies | Hierarchical relationship: contains |
| Revision control | Track changes over time | Property: revision + lifecycle |
| Search/filter | Find items quickly | View: data-table with filters |
| Change orders (ECO) | Control modifications | Entity: change_order with workflow |
| Document attachment | CAD files, specs | Entity: document + relationship |
| User permissions | Control who can release | Permissions YAML |
| Audit trail | Who changed what when | Events table (built-in) |
| Export to Excel | Everyone needs this | API: export endpoint |

### 4.3 Differentiators

| Feature | Who Has It | Our Advantage | Priority |
|---------|-----------|---------------|----------|
| AI-assisted BOM health | Arena (paid add-on) | Include by default via expressions | High |
| Inline editing | OpenBOM | Modern React table components | High |
| Mobile approval | Propel | Progressive web app | Medium |
| Visual BOM comparison | Arena, Propel | Side-by-side diff view | Medium |
| Supplier risk scoring | Arena SCI | Computed property from multiple inputs | High |
| Natural language search | Few | Integrate LLM | Low |

### 4.4 Common Complaints (from reviews)

| Pain Point | Frequency | Source | Trellis Solution |
|------------|-----------|--------|------------------|
| Steep learning curve | High | G2, Capterra | Intuitive UI, progressive disclosure |
| Slow with large assemblies | High | G2 | Virtualized lists, lazy loading |
| Too many clicks for simple tasks | Medium | Capterra | Keyboard shortcuts, bulk actions |
| Complex navigation, easy to get lost | High | G2 | Breadcrumbs, consistent sidebar |
| Expensive per-seat licensing | High | All reviews | Competitive pricing |
| Poor mobile experience | Medium | G2 | PWA, responsive design |
| Change items auto-update in BOM unexpectedly | Medium | Arena reviews | Configurable: freeze revisions option |
| Long onboarding time | High | All reviews | Built-in tutorials, templates |
| Inconsistent support response | Medium | OpenBOM reviews | Self-service + documentation |

### 4.5 Anti-Patterns

| Anti-Pattern | Why It Fails | Trellis Approach |
|--------------|--------------|------------------|
| Desktop-first thick client | Users expect cloud, mobile | Cloud-native SaaS, responsive |
| Wizard-heavy workflows | Too many steps for simple tasks | Direct manipulation, inline edit |
| Modal dialogs for everything | Blocks context, frustrating | Panels, inline expansion |
| Separate apps for PLM/QMS/PIM | Context switching overhead | Unified product |
| Hidden features in nested menus | Users can't find capabilities | Command palette, search |
| Over-customization without defaults | Analysis paralysis | Opinionated defaults, optional customization |
| Automatic BOM cascade without warning | Unexpected changes to released items | Explicit change control, notifications |

---

## 5. UX Patterns

### 5.1 Navigation

| Pattern | Used By | Notes |
|---------|---------|-------|
| Left sidebar with categories | Arena, Propel, OpenBOM | Standard, works well |
| Tabs for entity sections | All | Group related properties |
| Breadcrumbs for hierarchy | Arena, Teamcenter | Essential for nested BOMs |
| Global search | All | Cmd+K style preferred |

### 5.2 List/Table Views

| Pattern | When Used | Trellis Block |
|---------|-----------|---------------|
| Data table with column resize | Part lists | `trellis.data-table` |
| Inline editing in table | Quick updates | `trellis.data-table` (editable mode) |
| Tree view for BOM | Hierarchical display | `trellis.tree-table` |
| Kanban for ECOs | Change workflow | `trellis.kanban` |

### 5.3 Detail Views

| Pattern | When Used | Trellis Block |
|---------|-----------|---------------|
| Tabbed sections | Part detail (Overview, BOM, Docs, History) | `trellis.tabs` |
| Split view | Part + related BOM | `trellis.split-panel` |
| Slide-over panel | Quick edit without navigation | `trellis.panel` |
| Full-page form | New part creation | `trellis.property-editor` |

### 5.4 Common Widgets

| Widget | Purpose | Trellis Equivalent |
|--------|---------|-------------------|
| Revision selector dropdown | View historical versions | Custom block or property widget |
| Approval workflow indicator | Show ECO progress | Status badge + timeline |
| BOM cost rollup | Show total assembly cost | Computed property + display widget |
| Where-used panel | Find all parents of a part | Relationship query block |
| Compare revisions | Visual diff | Custom comparison block |

---

## 6. Workflows

### 6.1 Part Release Workflow

**Workflow: `release_part`**
```
[Draft] ──▶ [Submit for Review] ──▶ [In Review] ──▶ [Released]
                                        │
                                        ▼
                                    [Rejected] ──▶ [Draft]
```

**Mapped to Trellis:**
- Entity: part
- State property: status
- Transitions: submit_for_review, release, reject

### 6.2 Engineering Change Order (ECO) Workflow

**Workflow: `eco_process`**
```
[Draft] ──▶ [Submitted] ──▶ [In Review] ──▶ [Approved] ──▶ [Implemented]
                               │
                               ▼
                           [Rejected]
```

**Mapped to Trellis:**
- Entity: change_order
- State property: status
- Transitions: submit, start_review, approve, reject, implement
- Approval: Multi-approver with signature capture

### 6.3 BOM Update Workflow

**Workflow: `update_bom`**
1. Create ECO referencing affected assembly
2. Make changes to BOM in draft revision
3. Submit ECO for approval
4. Upon approval, release new assembly revision
5. Notify downstream (manufacturing, procurement)

**Mapped to Trellis:**
- Trigger: ECO approved event
- Action: Create new revision of affected assemblies
- Notification: Webhook to external systems

---

## 7. Gap Analysis

### 7.1 What No One Does Well

| Gap | Why It's Hard | Trellis Opportunity |
|-----|---------------|---------------------|
| Real-time collaboration on BOMs | Conflict resolution complex | WebSocket sync + OT/CRDT |
| Natural language BOM queries | Requires LLM integration | "Show me all parts from Supplier X" |
| Automatic cost variance alerts | Needs continuous supplier data | Computed properties + thresholds |
| Cross-company BOM sharing | Security, data sovereignty | Tenant isolation with sharing tokens |
| Mobile-first BOM editing | Complex UI on small screens | Focused mobile views, not full app |

### 7.2 Quick Wins

| Opportunity | Effort | Impact | Notes |
|-------------|--------|--------|-------|
| Keyboard shortcuts | Low | High | Cmd+K search, arrow navigation |
| Bulk status update | Low | High | Select multiple, change state |
| CSV import/export | Low | High | Every customer needs this |
| Dark mode | Low | Medium | Engineers love it |
| BOM comparison view | Medium | High | Side-by-side revision diff |

### 7.3 Long-Term Advantages

| Opportunity | Why Sustainable | Dependencies |
|-------------|-----------------|--------------|
| AI BOM health monitoring | Proprietary model training | Expression engine + ML |
| Full audit compliance | Event sourcing built-in | Core architecture |
| Multi-tenant data sharing | Unique in market | Tenant architecture |
| Computed properties on anything | Flexible expressions | Expression engine |

---

## 8. Draft YAML Output

### 8.1 Product Manifest

```yaml
# products/plm/product.yaml
id: plm
version: 1.0.0
name: Product Lifecycle Management
description: |
  Manage parts, assemblies, BOMs, engineering changes, and documentation.
  Built for electronics, medical devices, and discrete manufacturing.

defaultView: parts-list

features:
  - bom-management
  - change-orders
  - document-control
  - supplier-management
  - revision-control

requires:
  platformVersion: ">=1.0.0"
  blocks:
    - trellis.data-table
    - trellis.tree-table
    - trellis.page-layout
    - trellis.page-header
    - trellis.property-editor
    - trellis.tabs
    - trellis.kanban
    - trellis.panel

settings:
  locale: en-US
  theme:
    primaryColor: "#0066cc"

includes:
  entities: entities/*.yaml
  views: views/*.yaml
  navigation: navigation.yaml
```

### 8.2 Entity: Part

```yaml
# products/plm/entities/part.yaml
id: part
name: Part
description: A component or raw material used in product assemblies
icon: cube

properties:
  - name: part_number
    label: Part Number
    type: text
    required: true
    unique: true
    validation:
      pattern: "^[A-Z0-9-]+$"
      patternMessage: "Part numbers must be uppercase letters, numbers, and hyphens"
    ui:
      placeholder: "e.g., PN-001234"

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
    required: true
    default: "A"
    ui:
      helpText: "Current revision letter or number"

  - name: status
    label: Status
    type:
      type: option
      options:
        - value: draft
          label: Draft
          color: gray
          icon: pencil
        - value: in_review
          label: In Review
          color: yellow
          icon: clock
        - value: released
          label: Released
          color: green
          icon: check-circle
        - value: obsolete
          label: Obsolete
          color: red
          icon: x-circle
    default: draft

  - name: category
    label: Category
    type:
      type: reference
      entityType: category
      displayProperty: name

  - name: unit_of_measure
    label: Unit of Measure
    type:
      type: option
      options:
        - value: each
          label: Each
        - value: kg
          label: Kilogram
        - value: m
          label: Meter
        - value: L
          label: Liter
    default: each

  - name: weight
    label: Weight
    type:
      type: number
      dimension: mass
      unit: kg
      min: 0

  - name: make_buy
    label: Make/Buy
    type:
      type: option
      options:
        - value: make
          label: Make (internal)
        - value: buy
          label: Buy (purchased)
    default: buy

  - name: lead_time_days
    label: Lead Time (days)
    type:
      type: integer
      min: 0

  - name: unit_cost
    label: Unit Cost
    type:
      type: number
      dimension: currency
      unit: USD
      min: 0
    ui:
      widget: currency

  - name: rohs_compliant
    label: RoHS Compliant
    type: boolean
    default: false

computed:
  - name: display_name
    label: Display Name
    expression: "CONCAT(@self.part_number, ' - ', @self.name)"

  - name: is_active
    label: Is Active
    expression: "@self.status == 'released'"

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
      deletable: false

    - value: released
      label: Released
      color: green
      editable: false
      deletable: false

    - value: obsolete
      label: Obsolete
      color: red
      editable: false
      deletable: false

  transitions:
    - from: draft
      to: in_review
      action: submit_for_review
      label: Submit for Review
      when: "@self.part_number != null && @self.name != null"

    - from: in_review
      to: released
      action: release
      label: Release
      requiresApproval: true

    - from: in_review
      to: draft
      action: reject
      label: Reject

    - from: released
      to: obsolete
      action: obsolete
      label: Mark Obsolete

ui:
  displayProperty: display_name
  listProperties: [part_number, name, revision, status, category, unit_cost]
  searchProperties: [part_number, name, description]
  groups:
    - name: identification
      label: Identification
      properties: [part_number, name, description, revision, status]
    - name: classification
      label: Classification
      properties: [category, make_buy, unit_of_measure]
    - name: physical
      label: Physical Properties
      properties: [weight, rohs_compliant]
    - name: procurement
      label: Procurement
      properties: [unit_cost, lead_time_days]
```

### 8.3 Entity: Change Order

```yaml
# products/plm/entities/change-order.yaml
id: change_order
name: Engineering Change Order
description: ECO tracking modifications to released items
icon: git-branch

properties:
  - name: eco_number
    label: ECO Number
    type: text
    required: true
    unique: true
    autoGenerate:
      prefix: "ECO-"
      pattern: "YYYY-####"

  - name: title
    label: Title
    type: text
    required: true
    validation:
      maxLength: 200

  - name: description
    label: Description
    type:
      type: text
      maxLength: 5000
    required: true
    ui:
      widget: richtext

  - name: reason
    label: Reason
    type:
      type: option
      options:
        - value: design_improvement
          label: Design Improvement
        - value: cost_reduction
          label: Cost Reduction
        - value: defect_fix
          label: Defect Fix
        - value: compliance
          label: Regulatory Compliance
        - value: customer_request
          label: Customer Request
    required: true

  - name: priority
    label: Priority
    type:
      type: option
      options:
        - value: low
          label: Low
          color: gray
        - value: medium
          label: Medium
          color: yellow
        - value: high
          label: High
          color: orange
        - value: critical
          label: Critical
          color: red
    default: medium

  - name: status
    label: Status
    type:
      type: option
      options:
        - value: draft
          label: Draft
          color: gray
        - value: submitted
          label: Submitted
          color: blue
        - value: in_review
          label: In Review
          color: yellow
        - value: approved
          label: Approved
          color: green
        - value: rejected
          label: Rejected
          color: red
        - value: implemented
          label: Implemented
          color: purple
    default: draft

  - name: requestor
    label: Requestor
    type:
      type: reference
      entityType: user
      displayProperty: name
    required: true

  - name: implementation_date
    label: Implementation Date
    type: datetime
    ui:
      widget: datepicker

  - name: cost_impact
    label: Cost Impact
    type:
      type: number
      dimension: currency
      unit: USD
    ui:
      widget: currency
      helpText: "Estimated cost change (positive = increase)"

computed:
  - name: days_open
    label: Days Open
    expression: "IF(@self.status == 'implemented', 0, DATEDIFF(NOW(), @self.created_at))"

lifecycle:
  stateProperty: status
  initialState: draft

  states:
    - value: draft
      label: Draft
      color: gray
      editable: true
      deletable: true

    - value: submitted
      label: Submitted
      color: blue
      editable: false
      deletable: false

    - value: in_review
      label: In Review
      color: yellow
      editable: false
      deletable: false

    - value: approved
      label: Approved
      color: green
      editable: false
      deletable: false

    - value: rejected
      label: Rejected
      color: red
      editable: false
      deletable: false

    - value: implemented
      label: Implemented
      color: purple
      editable: false
      deletable: false

  transitions:
    - from: draft
      to: submitted
      action: submit
      label: Submit

    - from: submitted
      to: in_review
      action: start_review
      label: Start Review

    - from: in_review
      to: approved
      action: approve
      label: Approve
      requiresApproval: true

    - from: in_review
      to: rejected
      action: reject
      label: Reject

    - from: approved
      to: implemented
      action: implement
      label: Mark Implemented

ui:
  displayProperty: eco_number
  listProperties: [eco_number, title, reason, priority, status, requestor]
  searchProperties: [eco_number, title, description]
```

---

## 9. Research Sources

### 9.1 Competitor Materials

| Competitor | Source Type | URL/Notes |
|------------|-------------|-----------|
| Arena PLM | Website | https://www.arenasolutions.com/ |
| Arena PLM | G2 Reviews | https://www.g2.com/products/arena-plm-qms/reviews |
| Arena PLM | Capterra | https://www.capterra.com/p/6101/Arena-PLM/ |
| Propel PLM | Website | https://www.propelsoftware.com/ |
| Propel PLM | G2 Reviews | https://www.g2.com/products/propel-propel/reviews |
| OpenBOM | Website | https://www.openbom.com/ |
| OpenBOM | Pricing | https://www.openbom.com/pricing |
| OpenBOM | G2 Reviews | https://www.g2.com/products/openbom/reviews |
| Siemens Teamcenter | G2 | https://www.g2.com/products/siemens-teamcenter/reviews |
| PTC Windchill | Docs | https://www.ptc.com/en/products/windchill |

### 9.2 Review Analysis

| Source | Reviews Analyzed | Key Findings |
|--------|------------------|--------------|
| G2 | 50+ across tools | Learning curve is #1 complaint; cloud-native wins |
| Capterra | 30+ | Pricing concerns for SMBs; mobile experience lacking |
| TrustRadius | 20+ | Integration complexity with ERP |

### 9.3 Other Sources

| Source | Notes |
|--------|-------|
| OpenBOM blog | PLM selection guide for 2025 |
| Propel blog | ECO best practices |
| Industry articles | Digital thread, AI in PLM trends |

---

## Completion Checklist

- [x] All major competitors analyzed (6)
- [x] Core entities identified with properties (7 entities)
- [x] Relationships mapped (6 relationships)
- [x] Table stakes features listed (8)
- [x] Killer features captured (8)
- [x] Pain points documented with sources (9)
- [x] Anti-patterns identified (7)
- [x] Draft YAML validated against Trellis schema
- [x] Gap analysis complete
- [x] Sources documented
