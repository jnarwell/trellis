# Competitive Research Guide

How to conduct feature capture research for building Trellis products.

---

## Overview

This guide describes how to research a software domain and fill out the [Feature Capture Template](./FEATURE-CAPTURE-TEMPLATE.md). The goal is to produce actionable intelligence that translates directly into Trellis YAML configuration.

**Time estimate:** 4-8 hours per domain (thorough research)

---

## Legal Sources

Use ONLY these publicly available sources:

| Source Type | Examples | What to Extract |
|-------------|----------|-----------------|
| Marketing websites | arena.io, propelsoftware.com | Features, positioning, target market |
| Public documentation | docs.*, help.* | Entity structure, workflows, terminology |
| Demo videos | YouTube, Vimeo embeds | UX patterns, navigation, real workflows |
| Review sites | G2, Capterra, TrustRadius | Pain points, praise, switching reasons |
| Pricing pages | /pricing | Feature tiers, what's premium |
| Case studies | /customers, /case-studies | Use cases, industry verticals |
| Job postings | LinkedIn, company careers | Tech stack hints, growth areas |
| Public forums | Reddit, community forums | Real user problems, workarounds |

### What NOT To Do

- Reverse engineer code or APIs
- Violate Terms of Service
- Access paywalled content without permission
- Scrape data at scale
- Use proprietary training materials
- Copy UI designs pixel-for-pixel
- Misrepresent yourself to get demos

---

## Research Process

### Step 1: Identify Competitors (30 min)

1. Google "[domain] software" (e.g., "PLM software")
2. Check G2 category pages for the domain
3. Look at "alternatives to X" pages
4. Identify 5-7 competitors across tiers:
   - 2-3 Leaders (established, expensive)
   - 2-3 Challengers (growing, modern)
   - 1-2 Niche players (specialized)

**Output:** Filled competitor table in Section 1.2

### Step 2: Watch Demo Videos (2-3 hours)

This is the most valuable research activity.

**For each competitor:**
1. Find official demo videos (YouTube, website)
2. Watch 15-30 min demos, taking notes on:
   - What entities appear (sidebar items, object types)
   - What properties each entity has (form fields)
   - Navigation patterns (tabs, breadcrumbs, sidebars)
   - Key workflows shown (create, edit, approve, relate)
3. Screenshot interesting patterns

**Pro tips:**
- Play at 1.5x speed
- Pause on forms to capture field lists
- Note what they emphasize (differentiators)
- Note what they skip (pain points?)

**Output:** Draft entity list, properties, UX patterns

### Step 3: Read Documentation (1-2 hours)

Look for:
- Getting started guides (core workflows)
- API documentation (entity structure, relationships)
- Glossary/terminology pages
- Data model explanations

**Map to Trellis:**
- Their "object types" = our Entities
- Their "fields" = our Properties
- Their "links/associations" = our Relationships
- Their "workflows/pipelines" = our Lifecycles

**Output:** Refined entity definitions, relationship map

### Step 4: Analyze Reviews (1-2 hours)

**Process for each review site (G2, Capterra, TrustRadius):**

1. Filter to recent reviews (last 12 months)
2. Read 20-30 reviews (mix of ratings)
3. Track patterns in a tally:

```
| Theme | Count | Example Quote |
|-------|-------|---------------|
| Slow performance | IIII | "Takes forever to load" |
| Complex UI | IIII II | "Too many clicks" |
| Great support | III | "Support team is amazing" |
```

**Key questions:**
- What do users love? (table stakes)
- What frustrates them? (opportunities)
- Why did they switch? (pain points)
- What's missing? (gaps)

**Output:** Sections 4.4 (complaints) and 4.5 (anti-patterns)

### Step 5: Check Pricing Pages (30 min)

**Extract:**
- Feature tiers (what's in free vs. paid vs. enterprise)
- Per-seat vs. flat pricing
- What's considered "premium"
- Add-ons and integrations

**Insight:** Premium features often indicate high-value differentiators.

**Output:** Informs Section 4.3 (differentiators)

### Step 6: Synthesize Findings (1 hour)

1. Consolidate entity lists across competitors
2. Identify common properties (table stakes)
3. Map relationships and cardinalities
4. Define standard lifecycles
5. List features by category:
   - Table stakes (everyone has it)
   - Differentiators (some have it)
   - Gaps (no one does it well)

**Output:** Complete Sections 2-4

### Step 7: Draft YAML (1 hour)

Transform research into Trellis configuration:

1. Create entity YAML for each identified entity
2. Map properties with correct types:
   - Text fields → `type: text`
   - Numbers with units → `type: number` + `dimension`
   - Dropdowns → `type: option`
   - Related entities → `type: reference`
3. Add computed properties where identified
4. Define lifecycles from workflow analysis
5. Create relationships with correct cardinality

**Validate against:** [ADR-008](../adr/008-products-yaml.md)

**Output:** Section 8 with working YAML

---

## Type Mapping Cheat Sheet

| Competitor Pattern | Trellis Type | Notes |
|-------------------|--------------|-------|
| Text field | `text` | Add `maxLength` if needed |
| Number field | `number` | Add `dimension`, `unit` |
| Currency field | `number` + `dimension: currency` | Include `unit: USD` |
| Dropdown/Select | `option` | Define `options` array |
| Date picker | `datetime` | ISO 8601 format |
| Checkbox | `boolean` | |
| Link to other record | `reference` | Specify `entityType` |
| Tags/Multi-select | `list` of `text` or `option` | |
| Rich text | `text` + `ui: {widget: richtext}` | |
| Calculated field | Computed property | Write expression |
| Auto-number | `text` + unique + pattern | Or use ID |
| Attachment | Separate relationship | To document entity |

---

## Expression Patterns

When you identify calculated fields, translate to Trellis Expression Engine:

| Pattern | Expression |
|---------|------------|
| Price minus cost | `@self.price - @self.cost` |
| Margin percentage | `IF(@self.price > 0, (@self.price - @self.cost) / @self.price * 100, 0)` |
| Stock status | `IF(@self.quantity <= 0, 'Out of Stock', IF(@self.quantity <= @self.reorder_point, 'Low Stock', 'In Stock'))` |
| Full name | `CONCAT(@self.first_name, ' ', @self.last_name)` |
| Days until due | `DATEDIFF(@self.due_date, NOW())` |
| Sum of children | `SUM(#children.amount)` |
| Count of related | `COUNT(#related_items)` |

See [Expression Quick Reference](../../specs/config/EXPRESSION-QUICK-REF.md) for full syntax.

---

## Quality Checklist

Before considering research complete:

### Coverage
- [ ] Analyzed 5+ competitors
- [ ] Watched demo videos for top 3
- [ ] Read documentation for top 2
- [ ] Analyzed 50+ reviews across sites

### Entities
- [ ] All core entities identified
- [ ] Properties have correct types
- [ ] Required fields marked
- [ ] Computed properties have valid expressions

### Relationships
- [ ] All relationships mapped
- [ ] Cardinality specified
- [ ] Hierarchical relationships identified

### Features
- [ ] Table stakes complete (nothing missing)
- [ ] Killer features captured
- [ ] Pain points documented with sources
- [ ] Anti-patterns identified

### YAML
- [ ] Product manifest complete
- [ ] All entities have valid YAML
- [ ] YAML validates against schema
- [ ] Ready for implementation

---

## Tips for Effective Research

**Start broad, then focus:**
Begin with marketing materials for the landscape, then dive deep into 2-3 top competitors.

**Take screenshots:**
Capture forms, navigation, and key screens for reference when designing Trellis views.

**Track terminology:**
Each domain has specific terms. Document them to ensure your Trellis product speaks the user's language.

**Look for what's NOT shown:**
Demo videos hide pain points. Look for vague descriptions, skipped features, or "coming soon" mentions.

**Check job postings:**
Companies hiring for specific skills often signal product direction or technical debt.

**Find power users:**
Reddit, forums, and LinkedIn discussions reveal advanced use cases and workarounds.

**Compare pricing tiers:**
What's in Enterprise that's not in Pro? These are often the most valuable features.

---

## Example Output

See [examples/plm-capture-example.md](./examples/plm-capture-example.md) for a complete research document using this process.
