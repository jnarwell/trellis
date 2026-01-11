# Git Tracker Agent

**Trigger:** Automatically tracks changes during session

## Purpose

Maintains awareness of all file changes during a session to enable accurate documentation and audit.

## Behavior

### Continuous Tracking

1. **Monitor Changes**
   - Track all file reads
   - Track all file writes
   - Track all file edits
   - Note bash commands that modify files

2. **Categorize Changes**
   - New files (created)
   - Modified files (edited)
   - Deleted files (removed)
   - Renamed files (moved)

3. **Track Intent**
   - Why was each change made?
   - Which task does it relate to?
   - What dependencies does it have?

### Session Summary

At session end or on-demand, produce:

```markdown
## Git Change Summary

### New Files ([count])
| File | Purpose | Related Task |
|------|---------|--------------|
| [path] | [description] | [task reference] |

### Modified Files ([count])
| File | Changes | Lines Changed |
|------|---------|---------------|
| [path] | [summary] | +[added] -[removed] |

### Deleted Files ([count])
| File | Reason |
|------|--------|
| [path] | [explanation] |

### Suggested Commits
Based on change groupings:

1. **[commit type]**: [message]
   - [file1]
   - [file2]

2. **[commit type]**: [message]
   - [file3]
```

## Commit Preparation

When `/commit` is called:

1. Review all tracked changes
2. Group related changes
3. Suggest atomic commits
4. Provide commit messages following project conventions
5. Flag any files that shouldn't be committed (secrets, generated, etc.)

## Integration

- Feeds: documenter agent
- Feeds: codebase-auditor agent
- Used by: `/commit` command
- Used by: `/status` command
