# Scratchpad Format

Standard format for instance scratchpads.

## Why Scratchpads?

Scratchpads serve as:
1. **Working Memory** - Track findings during discovery
2. **Communication** - Share status with coordinator
3. **Documentation** - Record decisions and rationale
4. **Handoff** - Enable instance continuity

## File Naming

```
[DOMAIN]-SCRATCHPAD.md

Examples:
- FOUNDATION-SCRATCHPAD.md
- EXPRESSION-ENGINE-SCRATCHPAD.md
- BLOCK-RUNTIME-SCRATCHPAD.md
- TEST-DEBUG-SCRATCHPAD.md
```

## Standard Template

```markdown
# [Domain Name] Scratchpad

**Instance:** [number] - [responsibility name]
**Date:** [creation date]
**Status:** [Discovery Phase | Implementation Phase | Complete]

---

## Discovery Summary

### [Section 1: Primary Inventory]
[Tables of types, specs, or resources inventoried]

### [Section 2: Secondary Inventory]
[Additional relevant items]

---

## [Domain-Specific Section]
[Implementation details specific to this domain]

---

## Dependencies

### Confirmed Dependencies
| Dependency | Source | Status |
|------------|--------|--------|
| [name] | [package/instance] | [available/pending] |

### Integration Points
[How this work connects to other instances]

---

## Open Questions

### Resolved
| Question | Resolution |
|----------|------------|
| [question] | [answer] |

### Unresolved
| Question | Impact | Needs |
|----------|--------|-------|
| [question] | [what's blocked] | [who can answer] |

---

## Implementation Plan

### Files to Create
```
[directory structure]
```

### Implementation Order
1. [first file/component]
2. [second file/component]
...

---

## Ready for Implementation

- [ ] All specs read
- [ ] Types inventoried
- [ ] Dependencies confirmed
- [ ] Questions resolved
- [ ] Plan documented

---

## Completion Summary

[Filled after implementation]

### Verification Results
- [ ] Build passes
- [ ] Tests pass
- [ ] Integration verified

### Types Implemented
| File | Types |
|------|-------|
| [path] | [count and names] |

### Deviations from Spec
1. [deviation and reason]

### Questions for Other Instances
1. [cross-instance concern]

### Files Created
```
[final file structure]
```
```

## Section Guidelines

### Status Values

| Status | Meaning |
|--------|---------|
| Discovery Phase | Reading specs, inventorying |
| Implementation Phase | Writing code |
| Blocked | Waiting on dependency |
| Complete | All work done |

### Inventory Tables

Use tables for easy scanning:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| value | value | value |
```

### Code Blocks

Use fenced code blocks with language hints:

```markdown
```typescript
// TypeScript code
```

```sql
-- SQL code
```

```yaml
# YAML config
```
```

### Checklists

Use checkboxes for completion tracking:

```markdown
- [ ] Not done
- [x] Done
```

### Status Markers

Use emoji sparingly for quick visual scanning:

```markdown
**STATUS: COMPLETE** ✅
**STATUS: BLOCKED** ⏸️
**STATUS: IN PROGRESS** 🔄
```

## Updating Scratchpads

### During Discovery
- Add items as you find them
- Update tables with new entries
- Mark questions as resolved

### During Implementation
- Mark checklist items complete
- Note any deviations from plan
- Update file structure as created

### At Completion
- Fill in Completion Summary
- Update final status
- Document any handoff notes

## Examples

See project scratchpads for real examples:
- `FOUNDATION-SCRATCHPAD.md` - Type inventory pattern
- `EXPRESSION-ENGINE-SCRATCHPAD.md` - Grammar/AST pattern
- `BLOCK-RUNTIME-SCRATCHPAD.md` - Config types pattern
- `TEST-DEBUG-SCRATCHPAD.md` - Error types pattern
