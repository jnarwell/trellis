# Orchestration Plugin for Claude Code

A comprehensive plugin for managing multi-instance Claude Code sessions on complex projects.

## Overview

When working on large codebases, a single Claude Code session can become overloaded with context. This plugin codifies a methodology for splitting work across multiple parallel instances, each focused on a specific domain.

### Key Benefits

- **Parallel Development** - Multiple instances work simultaneously
- **Focused Context** - Each instance handles one domain
- **Explicit Contracts** - Clear interfaces between components
- **Trackable Progress** - Visible status across all work
- **Reduced Rework** - Discovery phase catches issues early

## Installation

```bash
# Clone into your Claude Code plugins directory
cd ~/.claude/plugins
git clone https://github.com/your-org/orchestration-plugin

# Or symlink during development
ln -s /path/to/orchestration-plugin ~/.claude/plugins/orchestration
```

## Quick Start

### 1. Spawn Foundation Instance

Start with a foundation instance to set up project infrastructure:

```
/spawn foundation --name "Instance 1 - Foundation"
```

### 2. Track Progress

Check status of all instances:

```
/status
```

### 3. Spawn Feature Instances

After foundation is ready, spawn feature instances:

```
/spawn feature --name "Instance 2 - Auth System" --deps "Instance 1"
/spawn feature --name "Instance 3 - Data Layer" --deps "Instance 1"
```

### 4. Cross-Review

Before integrating, review work across instances:

```
/review 1,2,3
```

### 5. Audit and Commit

Ensure quality before committing:

```
/audit
/commit --message "Add auth and data layer"
```

## Components

### Commands

| Command | Purpose |
|---------|---------|
| `/spawn` | Launch new instance with template |
| `/status` | Show orchestration status |
| `/audit` | Run codebase audit |
| `/commit` | Prepare and execute commit |
| `/review` | Cross-instance review |

### Agents

| Agent | Purpose |
|-------|---------|
| `documenter` | Auto-document changes |
| `codebase-auditor` | Comprehensive audit |
| `git-tracker` | Track file changes |
| `cross-reviewer` | Integration review |

### Skills

| Skill | Content |
|-------|---------|
| `orchestration-guide` | Full methodology |
| `discovery-protocol` | How to do discovery |
| `scratchpad-format` | Scratchpad templates |
| `spawn-templates` | Instance templates |

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Human Coordinator                            │
│  - Spawns instances      - Reviews progress                     │
│  - Resolves conflicts    - Makes decisions                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Instance 1    │     │   Instance 2    │
│   (Foundation)  │◄────│    (Feature)    │
│                 │     │                 │
│ - Scratchpad    │     │ - Scratchpad    │
│ - Types         │     │ - Implementation│
│ - Structure     │     │ - Tests         │
└─────────────────┘     └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
              ┌─────────────┐
              │  /review    │
              │  /audit     │
              │  /commit    │
              └─────────────┘
```

## Instance Lifecycle

### 1. Discovery Phase

Every instance starts with discovery:
- Read relevant specs
- Inventory types needed
- Map dependencies
- Document edge cases
- Resolve questions

### 2. Implementation Phase

After discovery:
- Implement according to plan
- Update scratchpad as you go
- Create tests alongside code
- Document deviations

### 3. Review Phase

Before completion:
- Self-audit with `/audit`
- Document integration points
- Update tracking status

## Scratchpad Convention

Each instance maintains a scratchpad file:

```
[DOMAIN]-SCRATCHPAD.md

Example:
FOUNDATION-SCRATCHPAD.md
AUTH-SYSTEM-SCRATCHPAD.md
```

Scratchpads contain:
- Discovery findings
- Type inventories
- Implementation plans
- Open questions
- Completion status

## Tracking Table

Maintain a central tracking table:

```markdown
| # | Instance | Responsibility | Phase | Status | Blocker |
|---|----------|----------------|-------|--------|---------|
| 1 | Foundation | Types, Structure | done | ✅ | - |
| 2 | Auth | Authentication | impl | 🔄 | - |
| 3 | Data | Data layer | impl | 🔄 | Awaits 2 |
```

## Best Practices

### Do

- ✅ Complete discovery before implementation
- ✅ Keep scratchpads updated
- ✅ Define clear instance boundaries
- ✅ Use type contracts for interfaces
- ✅ Run `/audit` before committing
- ✅ Run `/review` before integrating

### Don't

- ❌ Skip discovery phase
- ❌ Have overlapping responsibilities
- ❌ Assume implicit contracts
- ❌ Let scratchpads go stale
- ❌ Integrate without review
- ❌ Commit without audit

## Customization

### Adding Custom Commands

Create `.md` files in `commands/`:

```markdown
# /my-command - Description

## Usage
[usage info]

## Behavior
[what it does]
```

### Adding Custom Agents

Create `.md` files in `agents/`:

```markdown
# My Agent

**Trigger:** [when to use]

## Purpose
[what it does]

## Behavior
[detailed behavior]
```

### Adding Custom Skills

Create `.md` files in `skills/`:

```markdown
# Skill Name

[Content for the skill]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `/audit` to verify
5. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Credits

Methodology developed through practical use on the Trellis project, demonstrating effective multi-instance orchestration for complex TypeScript codebases.
