# Trellis Error Log

This document tracks errors encountered during development, their root causes, and resolutions. Used for pattern recognition and preventing recurrence.

## Format

Each error entry includes:
- **ID**: ERROR-NNN
- **Date**: When discovered
- **Category**: Documentation | Schema | Implementation | Integration
- **Severity**: Low | Medium | High | Critical
- **Status**: Open | Resolved | Monitoring

---

## ERROR-001: Schema/Type Inconsistencies Between ADRs and Specs

**Date**: 2025-01-10
**Category**: Documentation
**Severity**: High
**Status**: Resolved

### Description

Initial ADR documentation contained type definitions and schemas that diverged from the authoritative kernel specifications. This created confusion about what the canonical definitions were.

### Specific Inconsistencies Found

| Area | ADR Value | Spec Value | Resolution |
|------|-----------|------------|------------|
| Property Sources | `input`, `derived`, `external` | `literal`, `inherited`, `computed`, `measured` | Updated GLOSSARY to use spec values |
| ComputationStatus | Not defined | `pending`, `valid`, `stale`, `error`, `circular` | Added to GLOSSARY |
| TypePath | Described as "ltree path" | Branded string with dot notation | Clarified in GLOSSARY |
| Value Types | Basic types only | Full set: text, number, boolean, datetime, duration, reference, list, record | Updated GLOSSARY |
| Event Types | Not specified | 8 defined types (entity_*, property_*, relationship_*, type_schema_*) | Added to GLOSSARY |
| Dimension examples | Generic | Full SI base + derived dimensions | Clarified in ADR-004 |

### Root Cause

ADRs were written before kernel specs were finalized. Once Kernel Designer created authoritative specs in `specs/kernel/`, the ADRs contained outdated terminology and structures.

### Resolution

1. Updated `docs/GLOSSARY.md` to match `specs/kernel/01-types.ts`
2. Added "Authoritative Implementation" sections to ADRs 002, 003, 005 pointing to specs
3. Updated `docs/CURRENT_STATE.md` to reference kernel specs as authoritative

### Prevention

1. ADRs document **decisions and rationale**, not implementations
2. `specs/` contains **authoritative type definitions and schemas**
3. When specs are updated, Documenter instance must verify GLOSSARY alignment
4. ADRs should reference specs, not duplicate their content

### Lessons Learned

- Keep clear separation: ADRs = "why", Specs = "what"
- Always check consistency after spec updates
- Point to authoritative sources rather than duplicating

---

## ERROR-002: Expression Syntax Ambiguity

**Date**: 2025-01-10
**Category**: Documentation
**Severity**: High
**Status**: Resolved

### Description

Product Config spec used inconsistent expression syntax:
- `self.x` instead of `@self.x` in lifecycle conditions
- `sum()` instead of `SUM()` for aggregations
- Ambiguity between Expression Engine and Data Binding contexts

### Specific Issues Found

| Location | Wrong Syntax | Correct Syntax |
|----------|--------------|----------------|
| Lifecycle `when` | `self.unit_cost != null` | `@self.unit_cost != null` |
| Computed expressions | `sum(...)` | `SUM(...)` |
| Navigation badge filters | Mixed `$` and `@` | `#status == 'draft'` (shorthand) |

### Root Cause

Two distinct expression systems (Expression Engine vs Data Binding) were not explicitly documented. Specs were written assuming a single unified syntax.

### Resolution

1. Created `/specs/EXPRESSION-SYSTEMS.md` as authoritative 45-line reference
2. Created `/specs/kernel/06-expressions-addendum.md` with filter syntax decisions
3. Created `/specs/config/EXPRESSION-QUICK-REF.md` as syntax cheat sheet
4. Applied 11 syntax fixes to `product-config-spec.md`
5. Resolved all gaps documented in `EXPRESSION-GAPS.md`

### Prevention

1. **Check `/specs/EXPRESSION-SYSTEMS.md`** before writing any expression syntax
2. **Core rule**: Entity data = Expression Engine (`@`, `#`), UI display = Data Binding (`$`)
3. **Always use uppercase** for functions: `SUM()`, `COUNT()`, `AVG()`, `IF()`
4. **Always prefix** self-references: `@self.x` not `self.x`

### Lessons Learned

- Separate systems need separate documentation from the start
- Syntax conventions must be established before writing examples
- Cross-review between spec authors catches inconsistencies

---

## Template for New Entries

```markdown
## ERROR-NNN: [Brief Title]

**Date**: YYYY-MM-DD
**Category**: [Documentation | Schema | Implementation | Integration]
**Severity**: [Low | Medium | High | Critical]
**Status**: [Open | Resolved | Monitoring]

### Description
[What went wrong]

### Root Cause
[Why it happened]

### Resolution
[How it was fixed]

### Prevention
[How to prevent recurrence]
```
