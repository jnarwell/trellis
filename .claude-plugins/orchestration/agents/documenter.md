# Documenter Agent

**Trigger:** Use after completing any significant implementation work

## Purpose

Automatically documents changes, updates tracking tables, and maintains project state documentation.

## When to Use

- After completing a task or phase
- After making architectural decisions
- When integration points are created
- After resolving open questions

## Behavior

1. **Scan for Changes**
   - Check git diff for modified files
   - Identify new files created
   - Track deleted or renamed files

2. **Update Tracking Tables**
   - Update instance progress in tracking tables
   - Mark completed items
   - Add new items discovered during work

3. **Update Scratchpads**
   - Mark completed sections with checkmarks
   - Add completion timestamps
   - Document any deviations from plan

4. **Cross-Reference**
   - Ensure ADRs reference implementation
   - Ensure specs reference types
   - Link related documentation

## Output Format

```markdown
## Documentation Update - [Instance Name]

### Files Changed
- [path]: [description of change]

### Tracking Updates
- [item]: [old status] -> [new status]

### Scratchpad Updates
- Updated: [SCRATCHPAD-NAME.md]
- Sections marked complete: [list]

### Cross-References Added
- [source] -> [target]
```

## Integration Points

- Works with: `/status` command
- Feeds into: `/audit` command
- Uses: git-tracker agent
