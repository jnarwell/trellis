# /audit - Run Codebase Audit

Run comprehensive audit of codebase before committing or at milestones.

## Usage

```
/audit [scope] [options]
```

## Scopes

| Scope | Description |
|-------|-------------|
| `full` | Complete audit (default) |
| `types` | Type consistency only |
| `docs` | Documentation alignment only |
| `tests` | Test coverage only |
| `deps` | Dependency health only |
| `security` | Security checklist only |

## Options

| Option | Description |
|--------|-------------|
| `--fix` | Attempt to auto-fix issues |
| `--strict` | Treat warnings as errors |
| `--scope <path>` | Limit to specific path |
| `--since <commit>` | Only audit changes since commit |

## Examples

```bash
# Full audit before commit
/audit

# Quick type check
/audit types

# Audit with auto-fix
/audit --fix

# Audit only recent changes
/audit --since HEAD~5

# Strict audit for CI
/audit --strict
```

## Audit Checks

### Type Consistency
- [ ] All types match spec source
- [ ] No duplicate definitions
- [ ] Branded types used correctly
- [ ] No unexpected `any` types
- [ ] Imports use correct paths

### Documentation Alignment
- [ ] ADRs match implementation
- [ ] Specs match code
- [ ] GLOSSARY terms correct
- [ ] README files current
- [ ] Scratchpads updated

### Test Coverage
- [ ] New code has tests
- [ ] Fixtures exist
- [ ] Edge cases covered
- [ ] Integration tests present

### Dependency Health
- [ ] No circular deps
- [ ] Package boundaries respected
- [ ] Versions compatible
- [ ] No phantom deps

### Security Checklist
- [ ] No secrets in code
- [ ] RLS policies complete
- [ ] Input validation present
- [ ] No SQL injection risks

## Output

```markdown
## Audit Report

**Date:** 2026-01-10T14:30:00Z
**Scope:** full
**Duration:** 12.3s

### Summary

| Category | Pass | Warn | Fail |
|----------|------|------|------|
| Types | 45 | 2 | 0 |
| Docs | 12 | 0 | 1 |
| Tests | 30 | 5 | 0 |
| Deps | 8 | 0 | 0 |
| Security | 15 | 0 | 0 |

**Result:** YELLOW (warnings present)

### Findings

#### [FAIL] Documentation Alignment
- `specs/kernel/06-expressions.md` references `self.x` but implementation uses `@self.x`
  - Location: Line 42
  - Fix: Update spec to use `@self.x`

#### [WARN] Test Coverage
- `packages/kernel/src/expressions/evaluator.ts` missing tests for:
  - Division by zero
  - Circular dependency detection
  - Null propagation

### Recommendations

1. **High:** Fix documentation mismatch before commit
2. **Medium:** Add missing test cases
3. **Low:** Consider adding more edge case tests

### Exit Code

Use `--strict` to fail on warnings.
Current: PASS (warnings ignored)
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Pass (no failures) |
| 1 | Fail (failures present) |
| 2 | Error (audit couldn't complete) |

## Integration

- Uses: codebase-auditor agent
- Blocks: /commit command when failures present
- Feeds: /status command
