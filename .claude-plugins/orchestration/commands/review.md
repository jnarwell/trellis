# /review - Cross-Instance Review

Review work across instance boundaries for integration readiness.

## Usage

```
/review [instances] [options]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `instances` | Comma-separated instance numbers (default: all active) |

## Options

| Option | Description |
|--------|-------------|
| `--contracts` | Review type/API contracts only |
| `--integration` | Check integration points only |
| `--conflicts` | Check for conflicts only |
| `--deep` | Thorough review (slower) |
| `--report <file>` | Save report to file |

## Examples

```bash
# Review all active instances
/review

# Review specific instances
/review 5,6,7

# Quick contract check
/review --contracts

# Deep review with report
/review --deep --report review-report.md
```

## Review Process

### 1. Instance Discovery

```markdown
## Instances to Review

| # | Name | Status | Last Update |
|---|------|--------|-------------|
| 5 | Foundation | Complete | 2h ago |
| 6 | Expression Engine | Active | 30m ago |
| 7 | Block Runtime | Active | 45m ago |

Reviewing integration points between instances...
```

### 2. Contract Verification

```markdown
## Type Contracts

### kernel -> shared
| Type | Export | Import | Status |
|------|--------|--------|--------|
| EntityId | kernel/types/entity.ts:3 | shared/utils.ts:1 | OK |
| Value | kernel/types/value.ts:45 | shared/serialize.ts:2 | OK |

### kernel -> client
| Type | Export | Import | Status |
|------|--------|--------|--------|
| PropertyReference | kernel/types/expression.ts:12 | client/binding/ast.ts:5 | MISMATCH |

**Issue Found:** PropertyReference in client uses different structure
- kernel: `{ type: 'PropertyReference', base: {...} }`
- client: `{ kind: 'property-ref', target: {...} }`
```

### 3. Integration Point Check

```markdown
## Integration Points

### Expression Engine -> Block Runtime

| Interface | Producer (6) | Consumer (7) | Status |
|-----------|--------------|--------------|--------|
| parse() | expressions/parser.ts | binding/evaluator.ts | OK |
| evaluate() | expressions/evaluator.ts | binding/evaluator.ts | PENDING |

**Note:** Block Runtime awaiting evaluate() implementation from Expression Engine
```

### 4. Conflict Detection

```markdown
## Potential Conflicts

### File Conflicts
No file conflicts detected.

### Naming Conflicts
| Name | Instance 6 | Instance 7 | Resolution |
|------|------------|------------|------------|
| `parse` | expressions/parser.ts | config/parser.ts | Different modules, OK |
| `TokenType` | expressions/lexer.ts | binding/lexer.ts | CONFLICT - should share |

### Behavior Conflicts
| Behavior | Instance 6 | Instance 7 | Aligned? |
|----------|------------|------------|----------|
| Null handling | null propagates | null throws | NO |

**Action Required:** Align null handling behavior
```

### 5. Recommendations

```markdown
## Review Summary

**Instances Reviewed:** 5, 6, 7
**Status:** ISSUES FOUND

### Critical (Must Fix)
1. Align PropertyReference type between kernel and client
2. Align null handling behavior

### Important (Should Fix)
1. Share TokenType between expression and binding lexers
2. Add integration tests for parse() interface

### Nice to Have
1. Consider shared error types

### Sign-off Checklist
- [x] Type contracts verified
- [ ] Integration points tested
- [ ] Conflicts resolved
- [ ] Documentation updated

**Ready for Integration:** NO (2 critical issues)
```

## Output

Full markdown report with:
- Contract verification results
- Integration point status
- Conflict detection
- Actionable recommendations
- Sign-off checklist

## Integration

- Uses: cross-reviewer agent
- Feeds: /status command
- Blocks: integration when critical issues found
