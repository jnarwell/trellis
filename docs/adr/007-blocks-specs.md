# ADR-007: Blocks with Specs (Executable Contracts)

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis products are composed of reusable UI/logic components called "Blocks". Blocks need to:
- Declare their required inputs (props) with types
- Declare events they emit
- Declare actions they can receive
- Be validated at configuration time
- Enable type-safe wiring between blocks

This is similar to web component contracts or React prop-types, but enforced at the platform level.

## Decision Drivers

- Products are configured, not coded
- Configuration errors should be caught early
- Blocks from different sources must interoperate
- Clear documentation of block capabilities
- Runtime validation of block interactions

## Considered Options

1. **Block Specs (executable contracts)** - Formal specification language
2. **TypeScript interfaces** - Use TS types directly
3. **JSON Schema** - Standard schema validation
4. **No formal contracts** - Trust block authors

## Decision

Blocks have **Specs** - formal contracts defining their interface:

```typescript
interface BlockSpec {
  // Metadata
  id: string;
  name: string;
  version: string;
  description: string;

  // Props this block accepts
  props: PropDefinition[];

  // Events this block emits
  events: EventDefinition[];

  // Actions this block can receive
  receivers: ReceiverDefinition[];

  // Data requirements
  queries?: QueryDefinition[];
}

interface PropDefinition {
  name: string;
  type: PropType;
  required: boolean;
  default?: unknown;
  description: string;
  validation?: ValidationRule[];
}

type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'entity'        // Reference to an entity
  | 'entity[]'      // Array of entity references
  | 'option'        // Enum-like selection
  | 'expression'    // Trellis expression
  | 'component';    // Nested block

interface EventDefinition {
  name: string;
  description: string;
  payload: PayloadSchema;
}

interface ReceiverDefinition {
  name: string;
  description: string;
  params: ParamDefinition[];
}
```

### Example Block Spec

```yaml
# blocks/property-editor.spec.yaml
id: trellis.property-editor
name: Property Editor
version: 1.0.0
description: Editable display of entity properties

props:
  - name: entityId
    type: entity
    required: true
    description: The entity to edit

  - name: properties
    type: string[]
    required: false
    description: Which properties to show (all if omitted)

  - name: readonly
    type: boolean
    required: false
    default: false
    description: Disable editing

events:
  - name: propertyChanged
    description: Emitted when user changes a property
    payload:
      propertyName: string
      oldValue: any
      newValue: any

  - name: validationError
    description: Emitted when validation fails
    payload:
      propertyName: string
      error: string

receivers:
  - name: refresh
    description: Reload entity data
    params: []

  - name: focusProperty
    description: Scroll to and focus a property
    params:
      - name: propertyName
        type: string
```

### Consequences

**Positive:**
- Configuration validated before runtime
- Auto-generated documentation
- IDE support possible (autocomplete, validation)
- Clear boundaries between blocks
- Enables block marketplace/sharing

**Negative:**
- Spec maintenance overhead
- Version compatibility concerns
- Learning curve for block authors

**Neutral:**
- Specs stored in database and/or files
- Validation runs at product configuration time

## Implementation Notes

**Spec validation:**
```typescript
function validateBlockWiring(
  sourceBlock: BlockSpec,
  sourceEvent: string,
  targetBlock: BlockSpec,
  targetReceiver: string
): ValidationResult {
  const event = sourceBlock.events.find(e => e.name === sourceEvent);
  const receiver = targetBlock.receivers.find(r => r.name === targetReceiver);

  if (!event) return { valid: false, error: `Unknown event: ${sourceEvent}` };
  if (!receiver) return { valid: false, error: `Unknown receiver: ${targetReceiver}` };

  // Check payload compatibility
  return validatePayloadCompatibility(event.payload, receiver.params);
}
```

**Product configuration wiring:**
```yaml
# products/plm/views/part-detail.yaml
layout:
  - block: trellis.property-editor
    id: main-editor
    props:
      entityId: $route.entityId
      properties: [name, partNumber, weight, cost]

  - block: trellis.relationship-tree
    id: bom-tree
    props:
      rootEntityId: $route.entityId
      relationshipType: bom_contains

wiring:
  - source: main-editor.propertyChanged
    target: bom-tree.refresh

  - source: bom-tree.nodeSelected
    target: main-editor.focusProperty
    transform: { propertyName: $event.nodeName }
```

## References

- [ADR-008: Products as YAML Configuration](./008-products-yaml.md)
- [Web Components specification](https://www.webcomponents.org/)
