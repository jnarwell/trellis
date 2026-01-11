# Orchestration Guide

A comprehensive guide to orchestrating multiple Claude Code instances for parallel development.

## Core Philosophy

### Why Multi-Instance?

Single Claude Code sessions work well for focused tasks, but complex projects benefit from:

1. **Parallel Progress** - Multiple areas advance simultaneously
2. **Reduced Context Load** - Each instance focuses on one domain
3. **Explicit Contracts** - Forced to define interfaces upfront
4. **Better Tracking** - Clear ownership and responsibility
5. **Faster Completion** - Wall-clock time reduction

### When to Use Multi-Instance

**Good fit:**
- Large feature implementations (>500 lines across multiple files)
- Multiple independent subsystems
- Type-heavy projects needing careful contracts
- Projects with clear domain boundaries
- Teams wanting parallel progress

**Not needed:**
- Small bug fixes
- Single-file changes
- Quick prototypes
- Simple CRUD features

## Orchestration Roles

### 1. Coordinator (Human)

The human orchestrator:
- Spawns instances with clear responsibilities
- Maintains the master tracking table
- Resolves conflicts between instances
- Makes architectural decisions
- Reviews and approves integration

### 2. Foundation Instance

First instance, sets up:
- Monorepo structure
- Shared types and utilities
- Build/test infrastructure
- Core conventions

**Deliverables:**
- `package.json`, `tsconfig.base.json`
- `packages/` structure
- Core type definitions
- Initial tests passing

### 3. Feature Instances

Parallel instances implementing specific features:
- Read specs relevant to their domain
- Implement within established patterns
- Document integration points
- Create tests for their code

**Deliverables:**
- Implementation matching specs
- Unit tests
- Updated scratchpad
- Integration point documentation

### 4. Integration Instance

After feature work:
- Runs cross-review
- Resolves conflicts
- Ensures contracts match
- Runs full test suite

**Deliverables:**
- Integration test suite
- Conflict resolution documentation
- Ready-to-merge codebase

## Communication Protocol

### Instance-to-Instance

Instances don't communicate directly. Instead:

1. **Scratchpads** - Each instance maintains a scratchpad file
2. **Tracking Table** - Central table shows all instance status
3. **Type Contracts** - Shared types are the API between instances
4. **Integration Points** - Documented in scratchpads

### Information Flow

```
Instance A (scratchpad) -> Human Coordinator -> Instance B (context)
                              |
                        Tracking Table
                              |
                        Type Contracts
```

### Handoff Protocol

When one instance needs output from another:

1. Instance A documents need in scratchpad
2. Human notes dependency in tracking table
3. When Instance B completes, human notifies Instance A
4. Instance A reads shared types/files and continues

## Anti-Patterns

### Don't Do This

1. **Overlapping Responsibilities**
   - Each instance should own specific files/domains
   - If two instances need same file, one should own it

2. **Implicit Contracts**
   - Never assume another instance will do something
   - Document all expectations explicitly

3. **Skipping Discovery**
   - Always read specs before implementing
   - Discovery phase catches issues early

4. **Ignoring Scratchpads**
   - Scratchpads are the record of truth
   - Always update when status changes

5. **Late Integration**
   - Review contracts during implementation, not after
   - Regular cross-reviews prevent surprise conflicts

## Success Metrics

A well-orchestrated session:

- [ ] All instances have clear, non-overlapping responsibilities
- [ ] Each instance completed discovery before implementation
- [ ] Scratchpads accurately reflect work done
- [ ] Tracking table shows real-time status
- [ ] No blocking conflicts at integration time
- [ ] All tests pass after integration
- [ ] Documentation matches implementation
