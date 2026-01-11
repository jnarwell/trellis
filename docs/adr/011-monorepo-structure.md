# ADR-011: Monorepo Package Structure

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team
**Resolves:** OQ-010

## Context

Trellis is a full-stack TypeScript application that needs a monorepo structure to share code between frontend and backend while maintaining clear boundaries. We need to decide how to organize packages for optimal development experience, build performance, and code sharing.

## Decision Drivers

- Clear separation of concerns between packages
- Efficient code sharing (especially types)
- Fast build times with good caching
- Simple dependency graph
- Support for future growth (more packages)
- Team ownership boundaries

## Considered Options

### Option A: By Layer
```
packages/
  core/         # Shared types, utils
  api/          # Fastify server
  web/          # React frontend
  cli/          # CLI tools
```

### Option B: By Domain
```
packages/
  entities/     # Entity domain (types, API, UI)
  relationships/
  expressions/
  events/
```

### Option C: Hybrid (Layer + Kernel)
```
packages/
  kernel/       # Core domain types (no runtime)
  server/       # API implementation
  client/       # Frontend
  shared/       # Shared runtime utilities
```

## Decision

We chose **Option C: Hybrid** because:

1. **Kernel as pure types** - The kernel package contains only TypeScript types with zero runtime code. This ensures:
   - No circular dependencies
   - Minimal package size
   - Types can be shared without pulling in implementation

2. **Clear dependency direction** - Dependencies flow one way:
   ```
   kernel ← shared ← server
                   ← client
   ```

3. **Separation of concerns** - Each package has a single responsibility:
   - `@trellis/kernel`: Domain types and contracts
   - `@trellis/shared`: Shared runtime utilities (validation, serialization)
   - `@trellis/server`: Fastify API implementation
   - `@trellis/client`: React frontend application

4. **Build efficiency** - Turborepo can cache effectively because:
   - Kernel rarely changes (types are stable)
   - Server and client are independent (parallel builds)
   - Shared changes propagate predictably

## Implementation Details

### Package Manager: pnpm
- Strict dependency management
- Workspace protocol for internal deps
- Fast installs with content-addressable storage

### Build Orchestrator: Turborepo
- Declarative task pipeline
- Remote caching support
- Parallel execution of independent tasks

### TypeScript Configuration
- Base config in `tsconfig.base.json`
- Each package extends base
- Project references for incremental builds
- Strict mode everywhere

### Package Structure
```
trellis/
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
├── turbo.json                      # Turborepo task config
├── tsconfig.base.json              # Shared TS settings
├── packages/
│   ├── kernel/
│   │   ├── package.json            # @trellis/kernel
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Re-exports all types
│   │       ├── types/              # Type definitions
│   │       └── schema/migrations/  # SQL migrations
│   ├── server/
│   │   ├── package.json            # @trellis/server
│   │   ├── tsconfig.json
│   │   └── src/
│   ├── client/
│   │   ├── package.json            # @trellis/client
│   │   ├── tsconfig.json
│   │   └── src/
│   └── shared/
│       ├── package.json            # @trellis/shared
│       ├── tsconfig.json
│       └── src/
```

### Naming Convention
- Package names: `@trellis/<name>`
- Import paths: `@trellis/kernel`, `@trellis/shared`, etc.

## Consequences

### Positive
- Clear ownership and boundaries
- Minimal coupling between packages
- Efficient incremental builds
- Types shared without runtime overhead
- Easy to add new packages (e.g., `@trellis/cli`)

### Negative
- Monorepo tooling has learning curve
- pnpm workspace semantics differ from npm/yarn
- Need discipline to keep kernel pure (no runtime code)

### Neutral
- SQL migrations live in kernel (could be separate package later)
- No per-domain packages yet (may evolve as codebase grows)

## Related Decisions

- ADR-001: Technology Stack (TypeScript, Fastify, React, PostgreSQL)

## Notes

- Future packages might include: `@trellis/cli`, `@trellis/sdk`, `@trellis/testing`
- If domain boundaries become clearer, we may split further (e.g., `@trellis/expressions`)
- Consider extracting migrations to `@trellis/migrations` if they grow complex
