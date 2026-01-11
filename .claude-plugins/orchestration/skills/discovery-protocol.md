# Discovery Protocol

A structured approach to understanding requirements before implementation.

## Why Discovery First?

Jumping into code without discovery leads to:
- Misaligned implementations
- Rework when specs are discovered later
- Missing edge cases
- Integration conflicts

**Discovery-first prevents these by:**
- Building complete understanding
- Identifying ambiguities early
- Documenting decisions
- Creating implementation roadmap

## Discovery Phases

### Phase 1: Spec Reading

**Goal:** Understand what needs to be built

**Actions:**
1. Identify all relevant spec files
2. Read each spec completely (don't skim)
3. Note all types/interfaces defined
4. Note all behaviors specified
5. Note all edge cases mentioned

**Output:**
```markdown
## Spec Inventory

| Spec File | Relevant Sections | Key Types | Key Behaviors |
|-----------|-------------------|-----------|---------------|
| [path] | [sections] | [types] | [behaviors] |
```

### Phase 2: Type Inventory

**Goal:** Catalog all types needed

**Actions:**
1. List all types from specs
2. Check existing types in codebase
3. Identify gaps (types needed but not defined)
4. Identify conflicts (different definitions)

**Output:**
```markdown
## Type Inventory

### From Specs
| Type | Source | Status |
|------|--------|--------|
| [name] | [spec:line] | [exists/needed/conflict] |

### Existing Types
| Type | Location | Matches Spec? |
|------|----------|---------------|
| [name] | [file:line] | [yes/no/partial] |

### Type Gaps
| Type | Spec Source | Action Needed |
|------|-------------|---------------|
| [name] | [spec:line] | [create/extend/fix] |
```

### Phase 3: Dependency Mapping

**Goal:** Understand what this work depends on

**Actions:**
1. Identify other instances/packages this depends on
2. Identify what depends on this work
3. Map integration points

**Output:**
```markdown
## Dependencies

### Depends On
| Instance/Package | Types/APIs Used | Status |
|------------------|-----------------|--------|
| [name] | [what] | [available/pending] |

### Depended On By
| Instance/Package | Types/APIs Needed | Commitment |
|------------------|-------------------|------------|
| [name] | [what] | [when/how] |

### Integration Points
| Interface | Producer | Consumer | Contract |
|-----------|----------|----------|----------|
| [name] | [who] | [who] | [type/signature] |
```

### Phase 4: Edge Case Analysis

**Goal:** Identify all edge cases and error conditions

**Actions:**
1. List all edge cases from specs
2. Identify edge cases not in specs
3. Propose handling for each

**Output:**
```markdown
## Edge Cases

| Case | Source | Proposed Handling |
|------|--------|-------------------|
| Division by zero | spec | Return error |
| Empty list | spec | Return 0 for SUM, null for AVG |
| [case] | [discovered] | [proposal] |
```

### Phase 5: Open Questions

**Goal:** Surface and resolve ambiguities

**Actions:**
1. List anything unclear from specs
2. List decisions needed
3. Propose resolutions or escalate

**Output:**
```markdown
## Open Questions

### Resolved
| Question | Resolution | Source |
|----------|------------|--------|
| [question] | [answer] | [where decided] |

### Unresolved (Need Human Input)
| Question | Options | Impact |
|----------|---------|--------|
| [question] | [A/B/C] | [what depends on this] |
```

## Discovery Checklist

Before marking discovery complete:

- [ ] All relevant specs read completely
- [ ] Type inventory complete (including gaps)
- [ ] Dependencies mapped
- [ ] Edge cases documented
- [ ] Open questions resolved or escalated
- [ ] Implementation plan drafted
- [ ] Scratchpad updated with findings

## Discovery Artifacts

At the end of discovery, scratchpad should contain:

1. **Spec Inventory Table**
2. **Type Inventory Table**
3. **Dependency Map**
4. **Edge Case Table**
5. **Resolved Questions Table**
6. **Implementation File Plan**
7. "Ready for Implementation" marker

## Time Investment

Discovery typically takes 15-25% of total task time:

| Task Size | Discovery Time |
|-----------|----------------|
| Small (1-2 files) | 10-15 min |
| Medium (5-10 files) | 30-60 min |
| Large (10+ files) | 1-2 hours |

**This time investment prevents 2-3x rework later.**
