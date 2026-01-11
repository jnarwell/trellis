# /spawn - Launch New Instance

Launch a new parallel Claude Code instance for a specific task.

## Usage

```
/spawn <instance-type> [options]
```

## Instance Types

| Type | Purpose | Typical Duration |
|------|---------|------------------|
| `foundation` | Monorepo setup, base types, infrastructure | First instance |
| `feature` | Implement a specific feature | 1-3 hours |
| `integration` | Integrate work from multiple instances | After features |
| `test` | Write tests and fixtures | After implementation |
| `docs` | Update documentation | After features |
| `review` | Cross-review and audit | Before commit |

## Options

| Option | Description |
|--------|-------------|
| `--name <name>` | Instance name (default: auto-generated) |
| `--deps <instances>` | Comma-separated list of instance dependencies |
| `--phase <phase>` | Starting phase: discovery, implementation, review |
| `--scratchpad` | Create scratchpad file for this instance |

## Examples

```bash
# Spawn foundation instance
/spawn foundation --name "Instance 5 - Foundation Architect"

# Spawn feature instance with dependencies
/spawn feature --name "Instance 6 - Expression Engine" --deps "Instance 5"

# Spawn test instance after features are done
/spawn test --name "Instance 8 - Test Infrastructure" --deps "Instance 5,6,7"

# Spawn review instance
/spawn review --name "Instance 9 - Cross-Reviewer"
```

## Output

Creates and displays:

1. **Instance Tracking Entry**
```markdown
| Instance | Responsibility | Status | Dependencies |
|----------|----------------|--------|--------------|
| Instance 6 | Expression Engine | discovery | Instance 5 |
```

2. **Scratchpad Template** (if --scratchpad)
```markdown
# [Instance Name] Scratchpad

**Instance:** [number] - [name]
**Date:** [today]
**Status:** Discovery Phase

---

## Discovery Checklist
- [ ] Read relevant specs
- [ ] Inventory types needed
- [ ] Identify dependencies
- [ ] Document open questions

## Implementation Plan
[To be filled after discovery]

## Integration Points
[To be filled after discovery]

---

## Ready for Implementation
[ ] All discovery items complete
```

3. **Spawn Instructions**
Detailed instructions for what the new instance should do.

## Workflow

1. User calls `/spawn feature --name "Widget Builder"`
2. Command creates tracking entry
3. Command creates scratchpad file
4. Command outputs detailed instructions
5. User opens new Claude Code window
6. User pastes instructions to new instance
