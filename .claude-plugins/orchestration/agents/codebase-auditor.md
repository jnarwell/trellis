# Codebase Auditor Agent

**Trigger:** Run before commits, after merges, or on-demand

## Purpose

Performs comprehensive audit of codebase state to catch inconsistencies, missing pieces, and integration issues.

## When to Use

- Before committing significant changes
- After completing an implementation phase
- When preparing for cross-instance integration
- Before marking a milestone complete

## Audit Categories

### 1. Type Consistency
- All types match their spec source
- No duplicate type definitions
- Branded types used consistently
- No `any` types where specific types exist

### 2. Documentation Alignment
- ADRs reflect current implementation
- Specs match implementation
- GLOSSARY terms used correctly
- README files accurate

### 3. Test Coverage
- All new code has tests
- Test fixtures exist for all scenarios
- Integration points have integration tests
- Edge cases documented and tested

### 4. Dependency Health
- No circular dependencies
- Package boundaries respected
- Imports use correct package paths
- No accidental runtime dependencies in type-only packages

### 5. Error Handling
- All error types documented
- Error messages helpful
- Recovery paths implemented
- Error boundaries in place

### 6. Security Checklist
- No secrets in code
- RLS policies complete
- Input validation present
- SQL injection prevented

## Output Format

```markdown
## Codebase Audit Report

**Date:** [timestamp]
**Instance:** [instance name]
**Scope:** [files/packages audited]

### Summary
- Pass: [count]
- Warnings: [count]
- Failures: [count]

### Type Consistency
[findings]

### Documentation Alignment
[findings]

### Test Coverage
[findings]

### Dependency Health
[findings]

### Error Handling
[findings]

### Security Checklist
[findings]

### Recommendations
1. [priority] [action]
```

## Exit Conditions

- **Green:** All checks pass, safe to commit
- **Yellow:** Warnings present, document and proceed with caution
- **Red:** Failures present, must resolve before commit
