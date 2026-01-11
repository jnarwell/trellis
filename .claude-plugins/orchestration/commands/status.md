# /status - Show Orchestration Status

Display current status of all instances, tasks, and integration points.

## Usage

```
/status [scope]
```

## Scopes

| Scope | Description |
|-------|-------------|
| `all` | Full status of everything (default) |
| `instances` | Just instance tracking table |
| `tasks` | Just task completion status |
| `deps` | Dependency graph |
| `files` | Files changed this session |
| `blockers` | Current blockers and open questions |

## Examples

```bash
# Full status
/status

# Just instance status
/status instances

# Show dependency graph
/status deps

# Show blockers
/status blockers
```

## Output Format

### Full Status (`/status all`)

```markdown
## Orchestration Status

**Project:** [project name]
**Date:** [timestamp]
**Active Instances:** [count]

---

### Instance Tracking

| # | Instance | Responsibility | Phase | Status | Blocker |
|---|----------|----------------|-------|--------|---------|
| 5 | Foundation | Monorepo + Types | impl | [done] | - |
| 6 | Expression | Parser + Eval | impl | [active] | - |
| 7 | Block Runtime | Config + Binding | impl | [active] | Awaiting 6 |
| 8 | Test Infra | Debug + CI | disc | [active] | - |

---

### Task Progress

**Completed:** 23/45 (51%)

| Category | Done | Total | % |
|----------|------|-------|---|
| Types | 63 | 63 | 100% |
| Parser | 15 | 22 | 68% |
| Tests | 11 | 50 | 22% |

---

### Dependency Graph

```
Instance 5 (Foundation) [COMPLETE]
    ├── Instance 6 (Expression) [ACTIVE]
    ├── Instance 7 (Block Runtime) [ACTIVE]
    │   └── awaits Instance 6
    └── Instance 8 (Test) [ACTIVE]
        └── awaits Instance 6, 7
```

---

### Current Blockers

1. **Instance 7**: Awaiting expression AST types from Instance 6
   - Estimated resolution: When Instance 6 completes parser

2. **Open Question**: Division by zero handling
   - See: docs/OPEN_QUESTIONS.md#div-zero

---

### Files Modified This Session

| File | Status | Instance |
|------|--------|----------|
| packages/kernel/src/types/expression.ts | Modified | 6 |
| EXPRESSION-ENGINE-SCRATCHPAD.md | Modified | 6 |
```

## Integration

- Uses: git-tracker agent
- Updates: documenter agent
- Triggers: Automatically at session start
