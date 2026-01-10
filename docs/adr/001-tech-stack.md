# ADR-001: Technology Stack

**Status:** Accepted
**Date:** 2026-01-10
**Deciders:** Architecture Team

## Context

Trellis is a universal enterprise data platform that allows any enterprise tool (PLM, CRM, testing systems, etc.) to be configured from a common kernel. We need to select a technology stack that supports:
- Rapid iteration and type safety
- Flexible schema for arbitrary entity properties
- High performance for real-time updates
- Good developer experience

## Decision Drivers

- Type safety across the entire stack
- Ecosystem maturity and library availability
- Team expertise
- Performance for real-time collaboration
- Flexibility for schema-less data within structured boundaries

## Considered Options

1. **TypeScript + Fastify + Prisma + React + PostgreSQL** - Full TypeScript stack
2. **Go + React + PostgreSQL** - Go backend for performance
3. **Python + FastAPI + React + PostgreSQL** - Python backend
4. **Node.js + GraphQL + MongoDB** - Schema-less approach

## Decision

We will use **TypeScript + Fastify + Prisma + React + PostgreSQL with JSONB** because:

- **TypeScript everywhere** eliminates context switching and enables shared types
- **Fastify** is the fastest Node.js framework with excellent plugin architecture
- **Prisma** provides type-safe database access with great DX and migration tooling
- **React** is battle-tested for complex UIs with large ecosystem
- **PostgreSQL + JSONB** gives us relational integrity where needed (relationships, tenancy) with flexibility where needed (entity properties)

### Consequences

**Positive:**
- Single language across frontend/backend reduces cognitive load
- Shared type definitions between client and server
- Strong typing catches errors at compile time
- JSONB allows schema evolution without migrations for property data
- PostgreSQL's JSONB is indexed and queryable

**Negative:**
- Node.js single-threaded model requires careful handling of CPU-bound tasks
- JSONB queries can be slower than native columns for complex filtering
- Prisma has some limitations with raw JSONB operations

**Neutral:**
- Team needs to maintain discipline around TypeScript strictness
- May need to eject from Prisma for some advanced PostgreSQL features

## Implementation Notes

- Use `strict: true` in all tsconfig files
- Prefer Prisma's type-safe queries; use raw SQL only when necessary
- Consider worker threads for expression evaluation
- Use JSONB GIN indexes for property queries

## References

- [Fastify documentation](https://fastify.dev/)
- [Prisma documentation](https://www.prisma.io/docs)
- [PostgreSQL JSONB documentation](https://www.postgresql.org/docs/current/datatype-json.html)
