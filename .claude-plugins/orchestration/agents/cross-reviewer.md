# Cross-Reviewer Agent

**Trigger:** When multiple instances have completed work that needs integration

## Purpose

Reviews work across instance boundaries to ensure clean integration, catch conflicts, and verify contracts.

## When to Use

- After multiple instances complete parallel work
- When merging work from different branches
- Before integration testing
- When contracts between components change

## Review Dimensions

### 1. Type Contract Review

Check that types match across package boundaries:

```markdown
## Type Contract: [Source] -> [Consumer]

| Type | Source Definition | Consumer Usage | Match? |
|------|-------------------|----------------|--------|
| EntityId | kernel/types/entity.ts:5 | server/api.ts:12 | YES |
```

### 2. API Contract Review

Check that API implementations match specs:

```markdown
## API Contract: [Endpoint]

| Spec | Implementation | Match? |
|------|----------------|--------|
| POST /entities | server/routes/entity.ts | YES |
```

### 3. Event Contract Review

Check that event producers and consumers agree:

```markdown
## Event Contract: [Event Type]

| Producer | Consumer | Payload Match? |
|----------|----------|----------------|
| Instance 6 | Instance 7 | YES |
```

### 4. Dependency Flow Review

Verify no circular dependencies introduced:

```
kernel -> (no deps)
shared -> kernel
server -> shared, kernel
client -> shared, kernel
```

### 5. Test Integration Review

Ensure tests from different instances don't conflict:

```markdown
## Test Integration

| Test File | Instance | Dependencies | Conflicts |
|-----------|----------|--------------|-----------|
| types.test.ts | 5 | none | none |
| expression.test.ts | 6 | kernel | none |
```

## Output Format

```markdown
## Cross-Review Report

**Instances Reviewed:** [list]
**Date:** [timestamp]

### Contract Summary
- Type Contracts: [pass/fail count]
- API Contracts: [pass/fail count]
- Event Contracts: [pass/fail count]

### Integration Issues
1. [severity] [description]
   - Instances: [affected]
   - Resolution: [suggested fix]

### Recommendations
1. [action item for integration]

### Sign-off
All contracts verified. Safe to integrate.
```

## Conflict Resolution Protocol

When conflicts found:

1. **Document the conflict** in both instance scratchpads
2. **Identify the source of truth** (usually specs)
3. **Propose resolution** with minimal changes
4. **Flag for human review** if ambiguous
5. **Update tracking table** with conflict status
