# Trellis Block System Audit

> **Date**: 2026-01-13
> **Status**: Critical Integration Gaps Identified
> **Goal**: Make blocks "just work" from config - no code required

---

## Executive Summary

The Trellis block system has **fully implemented UI components** but **broken integration wiring**. Each block works perfectly in isolation with the correct props, but the path from YAML config → BlockRenderer → Block Component has inconsistent property mapping.

**The Problem**: Only `TableBlock` has a proper integration wrapper (`ConnectedTableBlock`). The other three blocks (`FormBlock`, `DetailBlock`, `KanbanBlock`) receive raw config props and must self-wire to the SDK.

---

## Block-by-Block Analysis

### 1. TableBlock ✅ **WORKING** (with integration wrapper)

**Files**:
- `blocks/table/TableBlock.tsx` (326 lines)
- `blocks/table/types.ts` (405 lines)
- `blocks/integration/ConnectedTableBlock.tsx` (310 lines)
- Supporting: `TableHeader.tsx`, `TableRow.tsx`, `TableCell.tsx`, `TablePagination.tsx`, `TableFilters.tsx`

**Architecture**:
```
Config (YAML)
    ↓
ViewRenderer.resolveRouteParams()
    ↓
BlockRenderer (detects 'table' type)
    ↓
buildTableBlockConfig() ← Normalizes entityType→source
    ↓
ConnectedTableBlock ← Calls useQuery(config.source)
    ↓
TableBlock (pure UI, receives data/loading/error as props)
```

**What Works**:
- ✅ Full config normalization (`entityType` → `source` fallback)
- ✅ SDK integration via `useQuery()`
- ✅ Pagination, sorting, filtering
- ✅ 12 cell formats
- ✅ Row click → navigation
- ✅ Selection modes
- ✅ Real-time updates possible via parent subscription

**Config → Props Mapping**:
| Config Key | ConnectedTableBlock | TableBlock |
|------------|---------------------|------------|
| `entityType` or `source` | → `config.source` | N/A (receives data) |
| `columns` | → `config.columns` | → `config.columns` |
| `pagination` | → `config.pagination` | → `config.pagination` |
| `onRowClick` | → handles internally | N/A |
| `rowClickTarget` | → calls `toView()` | N/A |

**Verdict**: ✅ **Model to follow for other blocks**

---

### 2. FormBlock ⚠️ **PARTIALLY WORKING** (self-wired, fragile)

**Files**:
- `blocks/form/FormBlock.tsx` (273 lines)
- `blocks/form/types.ts` (517 lines)
- `blocks/form/hooks.ts` (form state management)
- `blocks/form/FormField.tsx`, `FormActions.tsx`, `ConflictDialog.tsx`
- `blocks/form/fields/` (TextField, NumberField, SelectField, RelationField, etc.)

**Architecture**:
```
Config (YAML)
    ↓
ViewRenderer.resolveRouteParams() ← SHOULD resolve $route.params.id
    ↓
BlockRenderer (detects 'form' type)
    ↓
FormBlock ← Receives raw config props
    ↓
FormBlock SELF-WIRES:
  - mode = propMode ?? config.mode
  - entityId = propEntityId ?? config.entityId  ← MAY BE STRING LITERAL
  - useEntity(entityId) for edit mode
  - useCreateEntity() / useUpdateEntity() for submit
```

**What Works**:
- ✅ Form state management (useForm hook)
- ✅ 7 field types (text, textarea, number, boolean, date, select, relation)
- ✅ Validation with error messages
- ✅ Version conflict detection and resolution
- ✅ Create mode (POST new entity)
- ✅ Edit mode (PATCH existing entity)
- ✅ Navigation on cancel

**What's Broken**:
- ❌ **No `ConnectedFormBlock` wrapper** - relies on raw props
- ❌ **`entityId` may be literal string** `"$route.params.id"` if `resolveRouteParams` doesn't run
- ❌ **No `config` normalization** - expects exact prop names

**Config → Props Mapping**:
| Config Key | BlockRenderer Passes | FormBlock Expects |
|------------|---------------------|-------------------|
| `source` | ✅ config.source | ✅ config.source |
| `mode` | ✅ config.mode | ✅ config.mode |
| `entityId` | ⚠️ MAY BE `"$route.params.id"` string | ❌ Expects resolved EntityId |
| `fields` | ✅ config.fields | ✅ config.fields |
| `actions` | ✅ config.actions | ✅ config.actions |

**The Problem** (lines 63-65 in FormBlock.tsx):
```typescript
const mode = propMode ?? config.mode;
const entityId = propEntityId ?? config.entityId;  // If config.entityId = "$route.params.id", this breaks
const isEditMode = mode === 'edit' && entityId;    // isEditMode = true but entityId is wrong
```

**Fix Required**: Either:
1. Create `ConnectedFormBlock` that handles config normalization
2. Or ensure `ViewRenderer.resolveRouteParams()` runs BEFORE BlockRenderer

---

### 3. DetailBlock ⚠️ **PARTIALLY WORKING** (self-wired, fragile)

**Files**:
- `blocks/detail/DetailBlock.tsx` (234 lines)
- `blocks/detail/types.ts` (166 lines)
- `blocks/detail/DetailSection.tsx`, `DetailField.tsx`, `DetailActions.tsx`
- `blocks/detail/styles.ts`

**Architecture**:
```
Config (YAML)
    ↓
ViewRenderer.resolveRouteParams() ← SHOULD resolve $route.params.id
    ↓
BlockRenderer (detects 'detail' type)
    ↓
DetailBlock ← Receives raw config as props (spread)
    ↓
DetailBlock SELF-WIRES:
  - useEntity(entityId) ← entityId MUST be resolved
  - useDeleteEntity() for delete action
  - useNavigation() for action targets
```

**What Works**:
- ✅ Entity fetching via `useEntity()`
- ✅ Section-based field display
- ✅ 8 field formats (text, number, currency, datetime, date, time, boolean, badge, link)
- ✅ Action buttons with template evaluation
- ✅ Delete with navigation back
- ✅ Navigate action with `${$entity.id}` templates

**What's Broken**:
- ❌ **No `ConnectedDetailBlock` wrapper**
- ❌ **`entityId` may be literal string** `"$route.params.id"`
- ❌ **No config normalization**

**Config → Props Mapping**:
| Config Key | BlockRenderer Passes | DetailBlock Expects |
|------------|---------------------|---------------------|
| `entityId` | ⚠️ MAY BE literal string | ❌ Expects resolved EntityId |
| `source` | ✅ (optional) | ✅ (optional, for validation) |
| `sections` | ✅ config.sections | ✅ sections prop |
| `actions` | ✅ config.actions | ✅ actions prop |

**The Problem** (line 121 in DetailBlock.tsx):
```typescript
export const DetailBlock: React.FC<DetailBlockProps> = ({
  entityId,  // ← If this is "$route.params.id" string, useEntity() fails
  source,
  sections,
  actions,
  ...
}) => {
  const { data: entity, loading, error } = useEntity(entityId);  // entityId must be valid UUID
```

**Fix Required**: Create `ConnectedDetailBlock` or fix config resolution

---

### 4. KanbanBlock ⚠️ **PARTIALLY WORKING** (self-wired, template issues)

**Files**:
- `blocks/kanban/KanbanBlock.tsx` (283 lines)
- `blocks/kanban/types.ts` (153 lines)
- `blocks/kanban/KanbanColumn.tsx`, `KanbanCard.tsx`
- `blocks/kanban/useDragDrop.ts`
- `blocks/kanban/styles.ts`

**Architecture**:
```
Config (YAML)
    ↓
ViewRenderer (no special handling)
    ↓
BlockRenderer (detects 'kanban' type)
    ↓
KanbanBlock ← Receives raw config as props
    ↓
KanbanBlock SELF-WIRES:
  - useQuery(source) ← source MUST exist
  - useUpdateEntity() for drag-drop
  - useSubscription() for real-time
```

**What Works**:
- ✅ Entity querying via `useQuery(source)`
- ✅ Drag-and-drop between columns
- ✅ Status property update on drop
- ✅ Real-time subscription for updates
- ✅ WIP limits (column.limit)
- ✅ Card configuration (title, subtitle, badges)

**What's Broken**:
- ❌ **No `ConnectedKanbanBlock` wrapper**
- ❌ **Card templates use wrong syntax** - `${name}` doesn't work, needs `${$entity.name}`
- ❌ **No config normalization** - if config uses `entityType`, it fails

**Config → Props Mapping**:
| Config Key | BlockRenderer Passes | KanbanBlock Expects |
|------------|---------------------|---------------------|
| `source` | ✅ if config uses `source` | ✅ source prop |
| `entityType` | ❌ Not converted | ❌ NOT SUPPORTED |
| `statusProperty` | ✅ | ✅ |
| `columns` | ✅ | ✅ |
| `card` | ✅ | ✅ |
| `card.title` | ⚠️ `${name}` | ❌ Needs `${$entity.name}` |

**Template Problem** (in `main.tsx` demo):
```typescript
card: {
  title: '${name}',        // ❌ Wrong - won't evaluate
  subtitle: '${sku}',      // ❌ Wrong - won't evaluate
}
```

Should be:
```typescript
card: {
  title: '${$entity.name}',    // ✅ Correct
  subtitle: '${$entity.sku}',  // ✅ Correct
}
```

**Fix Required**:
1. Create `ConnectedKanbanBlock` with config normalization
2. Fix template syntax in demo
3. Add `entityType` → `source` fallback

---

## SDK Layer Assessment ✅ **WORKING**

**Files**:
- `state/hooks.ts` (535 lines) - React hooks
- `sdk/client.ts` - TrellisClient
- `sdk/http.ts` - HTTP client
- `sdk/entities.ts` - Entity API
- `sdk/query.ts` - Query builder
- `state/store.ts` - Context providers
- `state/cache.ts` - Entity cache

**Hooks Available**:
| Hook | Purpose | Status |
|------|---------|--------|
| `useEntity(id)` | Fetch single entity | ✅ Working |
| `useQuery(type, options)` | Query entities | ✅ Working |
| `useCreateEntity()` | Create mutation | ✅ Working |
| `useUpdateEntity()` | Update mutation | ✅ Working |
| `useDeleteEntity()` | Delete mutation | ✅ Working |
| `useSubscription(filter, callback)` | Real-time events | ✅ Working (graceful fallback) |
| `useCreateRelationship()` | Relationship mutation | ✅ Working |
| `useDeleteRelationship()` | Relationship mutation | ✅ Working |

**Verdict**: ✅ **SDK is solid, hooks are well-designed**

---

## Runtime Layer Assessment ⚠️ **GAPS**

### ViewRenderer.tsx

**What Works**:
- ✅ Route matching and view selection
- ✅ `resolveRouteParams()` function exists
- ✅ Multi-block view support
- ✅ Wiring manager integration
- ✅ Scope building with `$route`, `$view`

**What's Broken**:
- ⚠️ Route param resolution happens at ViewRenderer level, but BlockRenderer doesn't see it for all prop paths

### BlockRenderer.tsx

**What Works**:
- ✅ Block type detection
- ✅ Registry lookup
- ✅ BlockProvider wrapping
- ✅ Special handling for `table` → `ConnectedTableBlock`

**What's Broken**:
- ❌ **Only `table` has special handling** (lines 146-170)
- ❌ **Other blocks receive raw props** (lines 172-191)
- ❌ **No config normalization for form/detail/kanban**

**The Gap** (BlockRenderer.tsx lines 146-191):
```typescript
// Special handling for table blocks - use SDK-connected version
if (blockType === 'table' || blockType === 'trellis.data-table') {
  const tableConfig = buildTableBlockConfig(config);  // ← Normalization!
  return <ConnectedTableBlock config={tableConfig} />;
}

// ❌ NO SPECIAL HANDLING FOR form/detail/kanban
const BlockComponent = getBlockComponent(blockType);
const { block: _block, id: _id, ...blockProps } = config;
return <BlockComponent {...blockProps} config={blockProps} />;  // ← Raw props!
```

---

## Demo Configuration Issues

### main.tsx Analysis

**Inconsistent Property Names**:
```typescript
// Table views - use entityType (legacy)
products: { entityType: 'product', ... }    // ❌ Only works because of fallback
categories: { entityType: 'category', ... } // ❌ Only works because of fallback

// Kanban view - uses source (correct)
'product-board': { source: 'product', ... } // ✅ Correct

// Form views - use source (correct)
'product-create': { source: 'product', ... } // ✅ Correct

// Detail view - correct but entityId is literal
'product-detail': { entityId: '$route.params.id', ... } // ⚠️ Needs resolution
```

**Template Syntax Inconsistency**:
```typescript
// Kanban cards - WRONG
card: { title: '${name}', subtitle: '${sku}' }

// Detail actions - CORRECT
target: '/products/${$entity.id}/edit'
```

---

## What "Just Works" Means

### Current State (Broken)
```yaml
# User writes this config:
products:
  block: table
  entityType: product  # Must know to use source or entityType
  columns: [...]

product-detail:
  block: detail
  entityId: $route.params.id  # Hope it gets resolved
  sections: [...]
```

### Desired State (Working)
```yaml
# User writes this - it just works:
products:
  block: table
  entity: product      # Any of: entity, entityType, source - all work
  columns: [...]

product-detail:
  block: detail
  entity: product      # Block knows what type
  entityId: :id        # Simple route param syntax
  sections: [...]
```

---

## Recommended Fixes

### Fix 1: Create Connected Wrappers for All Blocks

Create `ConnectedFormBlock`, `ConnectedDetailBlock`, `ConnectedKanbanBlock` that:
1. Normalize config property names
2. Resolve route parameters
3. Handle SDK wiring
4. Pass clean props to UI component

```typescript
// Example: ConnectedFormBlock
export function ConnectedFormBlock({ config, instanceId }: Props) {
  // Normalize config
  const normalizedConfig = buildFormBlockConfig(config);

  // Resolve entityId if it's a route param reference
  const resolvedEntityId = useResolvedEntityId(normalizedConfig.entityId);

  // Pass to UI component
  return (
    <FormBlock
      config={normalizedConfig}
      entityId={resolvedEntityId}
    />
  );
}
```

### Fix 2: Update BlockRenderer to Use Wrappers

```typescript
// BlockRenderer.tsx
if (blockType === 'table') {
  return <ConnectedTableBlock config={buildTableBlockConfig(config)} />;
}
if (blockType === 'form') {
  return <ConnectedFormBlock config={buildFormBlockConfig(config)} />;
}
if (blockType === 'detail') {
  return <ConnectedDetailBlock config={buildDetailBlockConfig(config)} />;
}
if (blockType === 'kanban') {
  return <ConnectedKanbanBlock config={buildKanbanBlockConfig(config)} />;
}
```

### Fix 3: Standardize Config Property Names

Create a universal config normalizer:
```typescript
function normalizeBlockConfig(config: Record<string, unknown>) {
  return {
    ...config,
    // Normalize entity type
    source: config.source ?? config.entityType ?? config.entity,
    // Normalize entity ID
    entityId: resolveEntityId(config.entityId),
  };
}
```

### Fix 4: Fix Demo Configuration

Update `main.tsx` to use consistent property names and correct template syntax.

---

## Priority Order

1. **HIGH**: Create `ConnectedDetailBlock` - most commonly used after table
2. **HIGH**: Create `ConnectedFormBlock` - essential for CRUD
3. **MEDIUM**: Create `ConnectedKanbanBlock` - nice to have
4. **MEDIUM**: Fix template syntax in Kanban cards
5. **LOW**: Standardize config property names across all blocks

---

## Appendix: File Inventory

### Blocks Directory Structure
```
packages/client/src/blocks/
├── index.ts                 # Public exports
├── registry.ts              # Block type → Component mapping
├── BlockProvider.tsx        # Context for wiring/scope
├── BlockRenderer.tsx        # Config → Component resolution
├── types.ts                 # Shared types
├── integration/
│   └── ConnectedTableBlock.tsx  # ← Only table has this
├── table/
│   ├── TableBlock.tsx
│   ├── TableHeader.tsx
│   ├── TableRow.tsx
│   ├── TableCell.tsx
│   ├── TablePagination.tsx
│   ├── TableFilters.tsx
│   ├── hooks.ts
│   ├── types.ts
│   ├── styles.ts
│   └── index.ts
├── form/
│   ├── FormBlock.tsx        # ← Needs ConnectedFormBlock
│   ├── FormField.tsx
│   ├── FormActions.tsx
│   ├── ConflictDialog.tsx
│   ├── hooks.ts
│   ├── types.ts
│   ├── validation.ts
│   ├── fields/
│   │   ├── TextField.tsx
│   │   ├── NumberField.tsx
│   │   ├── SelectField.tsx
│   │   ├── BooleanField.tsx
│   │   ├── DateField.tsx
│   │   └── RelationField.tsx
│   └── index.ts
├── detail/
│   ├── DetailBlock.tsx      # ← Needs ConnectedDetailBlock
│   ├── DetailSection.tsx
│   ├── DetailField.tsx
│   ├── DetailActions.tsx
│   ├── types.ts
│   ├── styles.ts
│   └── index.ts
└── kanban/
    ├── KanbanBlock.tsx      # ← Needs ConnectedKanbanBlock
    ├── KanbanColumn.tsx
    ├── KanbanCard.tsx
    ├── useDragDrop.ts
    ├── types.ts
    ├── styles.ts
    └── index.ts
```

### Lines of Code Summary
| Component | LOC | Status |
|-----------|-----|--------|
| TableBlock + Connected | ~2,000 | ✅ Complete |
| FormBlock | ~1,500 | ⚠️ Needs wrapper |
| DetailBlock | ~800 | ⚠️ Needs wrapper |
| KanbanBlock | ~1,000 | ⚠️ Needs wrapper |
| SDK/Hooks | ~1,200 | ✅ Complete |
| Runtime | ~1,000 | ⚠️ Needs updates |
| **Total** | ~7,500 | |
