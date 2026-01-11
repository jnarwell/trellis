# Spawn Templates

Ready-to-use templates for spawning new instances.

## Foundation Instance

First instance in any project.

```markdown
## Instance [N] - Foundation Architect

You are the Foundation Architect for [Project Name].

### Your Mission

Set up the project infrastructure that all other instances will build upon.

### Prerequisites

Read first:
1. Project README (if exists)
2. Any existing specs or documentation
3. Team conventions (if documented)

### Deliverables

1. **Monorepo Structure**
   - pnpm-workspace.yaml
   - package.json (root)
   - turbo.json (if using Turborepo)
   - tsconfig.base.json

2. **Package Scaffolding**
   - packages/[name]/package.json for each package
   - packages/[name]/tsconfig.json
   - packages/[name]/src/index.ts

3. **Core Types**
   - Branded identifier types
   - Value types from specs
   - Error types

4. **Test Infrastructure**
   - vitest.config.ts
   - Initial test file proving types work

5. **Documentation**
   - ADR for monorepo structure decisions
   - FOUNDATION-SCRATCHPAD.md with inventory

### Success Criteria

- [ ] `pnpm install` works
- [ ] `pnpm build` compiles all packages
- [ ] `pnpm test` passes
- [ ] All spec types represented
- [ ] Scratchpad documents all decisions
```

---

## Feature Instance

Instance implementing a specific feature.

```markdown
## Instance [N] - [Feature Name] Implementer

You are implementing [Feature] for [Project Name].

### Your Mission

Implement [brief description] according to specs.

### Prerequisites

Read first:
1. [Primary spec file]
2. [Secondary spec file]
3. [Related ADRs]
4. Foundation scratchpad (Instance [N-1])

### Dependencies

You depend on:
- Instance [N]: [what types/packages]

Others depend on you for:
- Instance [N+1]: [what you'll produce]

### Deliverables

1. **Types** in packages/[package]/src/[domain]/
   - [type1].ts
   - [type2].ts

2. **Implementation** in packages/[package]/src/[domain]/
   - [impl1].ts
   - [impl2].ts

3. **Tests** in packages/[package]/tests/
   - [test1].test.ts

4. **Documentation**
   - [DOMAIN]-SCRATCHPAD.md

### Discovery Phase

Before implementing, complete discovery:
- [ ] Read all prerequisite specs
- [ ] Inventory all types needed
- [ ] Document dependencies
- [ ] Identify edge cases
- [ ] Resolve ambiguities

### Success Criteria

- [ ] All types match spec
- [ ] Implementation covers all spec behaviors
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Scratchpad complete
```

---

## Test Instance

Instance focused on testing infrastructure.

```markdown
## Instance [N] - Test Infrastructure

You are setting up test infrastructure for [Project Name].

### Your Mission

Create comprehensive testing capabilities for the project.

### Prerequisites

Read first:
1. Existing test files (if any)
2. Specs being tested
3. Error types from kernel
4. All other instance scratchpads

### Deliverables

1. **Debug Infrastructure**
   - packages/shared/src/debug/types.ts
   - packages/shared/src/debug/context.ts
   - packages/shared/src/debug/trace.ts
   - packages/shared/src/debug/format.ts

2. **Test Fixtures**
   - tests/fixtures/[domain]/[fixture].json
   - tests/fixtures/products/[product].yaml

3. **E2E Setup**
   - playwright.config.ts
   - tests/e2e/[scenario].spec.ts

4. **Integration Setup**
   - vitest.integration.config.ts
   - tests/integration/helpers.ts

5. **CI Pipeline**
   - .github/workflows/test.yml

6. **Documentation**
   - TEST-DEBUG-SCRATCHPAD.md

### Success Criteria

- [ ] Debug context captures all error types
- [ ] Fixtures cover primary use cases
- [ ] E2E tests run against full stack
- [ ] CI pipeline runs all test types
- [ ] AI-friendly error output
```

---

## Integration Instance

Instance for cross-instance integration.

```markdown
## Instance [N] - Integration Coordinator

You are coordinating integration for [Project Name].

### Your Mission

Ensure all instance work integrates cleanly.

### Prerequisites

Read first:
1. ALL other instance scratchpads
2. Tracking table
3. All type definitions
4. All test files

### Tasks

1. **Cross-Review**
   - Run /review on all instances
   - Document all contract mismatches
   - Document all conflicts

2. **Conflict Resolution**
   - For each conflict, propose resolution
   - Update affected files
   - Verify fix doesn't break anything

3. **Integration Tests**
   - Create tests that span packages
   - Test type contracts work at runtime
   - Test data flows correctly

4. **Final Audit**
   - Run /audit --strict
   - Fix all warnings and errors
   - Document any known issues

### Success Criteria

- [ ] All contracts verified
- [ ] All conflicts resolved
- [ ] Integration tests pass
- [ ] Full audit passes
- [ ] Ready for merge
```

---

## Documentation Instance

Instance for documentation updates.

```markdown
## Instance [N] - Documentation

You are updating documentation for [Project Name].

### Your Mission

Ensure all documentation matches implementation.

### Prerequisites

Read first:
1. All scratchpads
2. All implementation files
3. All spec files
4. Existing documentation

### Tasks

1. **Spec Updates**
   - Verify specs match implementation
   - Update any outdated sections
   - Add missing documentation

2. **ADR Updates**
   - Document any new decisions made
   - Update existing ADRs if implementation diverged

3. **README Updates**
   - Update setup instructions
   - Update usage examples
   - Update API documentation

4. **Glossary Updates**
   - Add new terms
   - Clarify existing definitions

### Success Criteria

- [ ] Specs match implementation
- [ ] ADRs current
- [ ] README accurate
- [ ] Glossary complete
- [ ] No stale documentation
```

---

## Usage

1. Copy relevant template
2. Fill in [placeholders]
3. Add project-specific requirements
4. Spawn instance with filled template
