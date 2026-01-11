# /commit - Prepare and Execute Commit

Prepare a well-structured commit with audit verification.

## Usage

```
/commit [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--message <msg>` | Commit message (prompted if omitted) |
| `--scope <scope>` | Commit scope (e.g., kernel, client) |
| `--type <type>` | Commit type (feat, fix, docs, etc.) |
| `--skip-audit` | Skip pre-commit audit (not recommended) |
| `--amend` | Amend previous commit |
| `--dry-run` | Show what would be committed |

## Examples

```bash
# Interactive commit
/commit

# Commit with message
/commit --message "Add expression parser" --type feat --scope kernel

# Dry run to preview
/commit --dry-run

# Quick commit (skip audit)
/commit --message "Fix typo" --skip-audit
```

## Workflow

### 1. Pre-Commit Audit

Unless `--skip-audit`, runs `/audit --strict`:

```
Running pre-commit audit...
[============================] 100%

Audit Result: PASS
Proceeding with commit preparation.
```

If audit fails:

```
Audit Result: FAIL

## Blocking Issues

1. Type mismatch in expression.ts:42
2. Missing test for evaluator.ts

Resolve these issues before committing.
Use --skip-audit to bypass (not recommended).
```

### 2. Change Analysis

Analyzes staged and unstaged changes:

```markdown
## Changes to Commit

### Staged Files (4)
- packages/kernel/src/expressions/parser.ts [new]
- packages/kernel/src/expressions/lexer.ts [new]
- packages/kernel/src/types/expression.ts [modified]
- EXPRESSION-ENGINE-SCRATCHPAD.md [modified]

### Unstaged Files (2)
- packages/kernel/src/expressions/evaluator.ts [modified]
- packages/kernel/tests/expression.test.ts [modified]

### Untracked Files (1)
- packages/kernel/src/expressions/ast.ts [new]

Stage additional files? [y/N]
```

### 3. Commit Message Generation

If no message provided:

```markdown
## Suggested Commit Message

Based on changes, suggested message:

```
feat(kernel): add expression parser and lexer

- Implement recursive descent parser for expression grammar
- Add lexer with 25 token types
- Extend AST types for full expression support
- Update scratchpad with discovery findings
```

Use this message? [Y/n/edit]
```

### 4. Commit Execution

```bash
git add [files]
git commit -m "[message]"
```

### 5. Post-Commit Update

Updates tracking:

```markdown
## Commit Complete

**Hash:** abc123f
**Message:** feat(kernel): add expression parser and lexer
**Files:** 5 changed, 420 insertions, 12 deletions

### Updated Tracking
- Instance 6 progress: 45% -> 60%
- Scratchpad status: Updated

### Next Steps
- Continue with evaluator implementation
- Run /status to see updated progress
```

## Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `test` | Adding tests |
| `chore` | Maintenance |

## Integration

- Requires: git-tracker agent
- Requires: codebase-auditor agent (for pre-audit)
- Updates: documenter agent
- Uses: Conventional Commits format
