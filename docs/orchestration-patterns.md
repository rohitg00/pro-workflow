# Orchestration Patterns

How to wire Commands, Agents, and Skills together for complex workflows.

## The Three Layers

```text
Command (entry point, user-facing)
  └── Agent (execution, constrained tools)
        └── Skill (domain knowledge, preloaded)
```

Each layer has a single responsibility:
- **Commands** handle user interaction and parameter collection
- **Agents** execute workflows with constrained tool access
- **Skills** provide domain-specific knowledge and procedures

## Pattern 1: Command > Agent > Skill

The most powerful pattern. A slash command delegates to an agent that has skills preloaded.

### Example: Feature Builder

**Command** (`commands/build-feature.md`):
```markdown
---
description: Build a feature end-to-end with planning, implementation, and tests
argument-hint: <feature description>
---

Build this feature using a structured approach:

1. Delegate to the planner agent to create a plan
2. Wait for plan approval
3. Implement the plan
4. Run quality gates
5. Create a commit

Feature: $ARGUMENTS
```

**Agent** (`agents/planner.md`):
```yaml
---
name: planner
description: Break down tasks into plans
tools: ["Read", "Glob", "Grep"]
skills: ["api-conventions", "project-patterns"]
model: opus
---
```

**Skill** (`skills/api-conventions/SKILL.md`):
```yaml
---
name: api-conventions
description: API design patterns for this project
user-invocable: false
---

REST endpoints use camelCase. Auth via Bearer tokens.
Error responses follow RFC 7807.
```

### How It Flows

1. User runs `/build-feature add user preferences`
2. Command expands `$ARGUMENTS` and delegates to planner agent
3. Planner loads with `api-conventions` skill already in context
4. Planner explores code, produces plan using skill knowledge
5. Control returns to command for approval
6. Implementation proceeds with full context

## Pattern 2: Multi-Phase Development (RPI)

Research > Plan > Implement with validation gates between phases.

### Structure

```text
.claude/
├── commands/
│   └── develop.md          # Entry point
├── agents/
│   ├── researcher.md       # Phase 1: explore and validate
│   ├── architect.md        # Phase 2: design
│   └── implementer.md      # Phase 3: build
└── skills/
    └── project-patterns/
        └── SKILL.md         # Shared knowledge
```

### The Flow

```text
/develop "add webhook support"
    │
    ▼
[Research Phase] → researcher agent
    │  - Explore existing code
    │  - Find similar patterns
    │  - Check dependencies
    │  - Score confidence (0-100)
    │
    ├── Score < 70 → HOLD (ask user for more context)
    │
    ▼
[Plan Phase] → architect agent
    │  - Design the solution
    │  - List all files to change
    │  - Identify risks
    │  - Present plan for approval
    │
    ├── User rejects → Back to research
    │
    ▼
[Implement Phase] → implementer agent
    │  - Execute the plan step by step
    │  - Run tests after each step
    │  - Quality gates at checkpoints
    │
    ▼
[Verify] → reviewer agent
    │  - Code review the changes
    │  - Security check
    │  - Performance check
    │
    ▼
[Commit] → /commit command
```

### Researcher Agent

```yaml
---
name: researcher
description: Explore codebase to assess feasibility before implementation
tools: ["Read", "Glob", "Grep", "Bash"]
background: true
isolation: worktree
memory: project
---
```

Key: runs in background with worktree isolation so it doesn't block the main session.

### Architect Agent

```yaml
---
name: architect
description: Design implementation plans with risk assessment
tools: ["Read", "Glob", "Grep"]
skills: ["project-patterns"]
model: opus
---
```

Key: read-only tools, Opus model for deep reasoning, preloaded project patterns.

## Pattern 3: Agent Skills vs On-Demand Skills

Two ways to use skills — understand when to use each.

### Agent Skills (Preloaded)

```yaml
# In agent frontmatter
skills: ["api-conventions", "error-handling"]
```

- Full skill content injected into agent context at startup
- Always available, no invocation needed
- Use for: domain knowledge the agent always needs
- Cost: uses context tokens

### On-Demand Skills (Invoked)

```yaml
# In skill frontmatter
user-invocable: true
```

- User runs `/skill-name` or Claude invokes via `Skill()` tool
- Content loaded only when called
- Use for: procedures run occasionally
- `context: fork` runs in isolated subagent context

### Decision Matrix

| Scenario | Use |
|----------|-----|
| Agent always needs this knowledge | Agent skill (preloaded) |
| User triggers occasionally | On-demand skill |
| Heavy procedure, don't pollute context | On-demand with `context: fork` |
| Background-only, never user-facing | `user-invocable: false` |

## Pattern 4: Agent Teams Orchestration

For large tasks, coordinate multiple agents working in parallel.

```bash
# Enable agent teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Team Composition

| Role | Agent | Responsibility |
|------|-------|---------------|
| Lead | Main session | Coordinate, assign tasks, synthesize |
| Frontend | Teammate 1 | UI components, styling, client logic |
| Backend | Teammate 2 | API endpoints, database, server logic |
| Tests | Teammate 3 | Test coverage, integration tests |

### Communication Flow

- Lead assigns tasks via shared task list
- Teammates work independently in their own context windows
- Teammates message each other directly (not just report back)
- Lead synthesizes results and handles conflicts

### When to Use Agent Teams vs Subagents

| Factor | Subagents | Agent Teams |
|--------|-----------|-------------|
| Context | Shares parent session | Independent windows |
| Communication | Returns result only | Direct messaging |
| Duration | Short tasks | Long sessions |
| Isolation | Optional worktree | Always isolated |
| Coordination | Parent manages | Shared task list |

## Pattern 5: Dynamic Command Substitution

Commands support string substitution for dynamic context.

```markdown
# In a command file

Current branch: !`git branch --show-current`
Last commit: !`git log --oneline -1`
Modified files: !`git diff --name-only`

Session: ${CLAUDE_SESSION_ID}
User argument: $ARGUMENTS
First word: $ARGUMENTS[0]
```

The `` !`command` `` syntax injects live output. Use for context-aware commands.

## Frontmatter Quick Reference

### Command Frontmatter

| Field | Type | Purpose |
|-------|------|---------|
| `description` | string | Shown in `/` menu |
| `argument-hint` | string | Placeholder text |
| `allowed-tools` | string[] | Tool whitelist |
| `model` | string | Override model |

### Agent Frontmatter

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Agent identifier |
| `description` | string | When to use (include PROACTIVELY for auto-invoke) |
| `tools` | string[] | Allowed tools |
| `disallowedTools` | string[] | Blocked tools |
| `model` | string | Model override |
| `permissionMode` | string | Permission level |
| `maxTurns` | number | Turn limit |
| `skills` | string[] | Preloaded skills |
| `mcpServers` | object | Agent-specific MCP servers |
| `hooks` | object | Agent-specific hooks |
| `memory` | string | `user` / `project` / `local` |
| `background` | boolean | Default to background execution |
| `isolation` | string | `worktree` for git isolation |
| `color` | string | Display color in agent teams |

### Skill Frontmatter

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Skill identifier |
| `description` | string | When to invoke |
| `argument-hint` | string | Parameter hint |
| `disable-model-invocation` | boolean | Prevent auto-invocation |
| `user-invocable` | boolean | Show in `/` menu |
| `allowed-tools` | string[] | Tool whitelist |
| `model` | string | Model override |
| `context` | string | `fork` for isolated execution |
| `agent` | string | Delegate to specific agent |
| `hooks` | object | Skill-specific hooks |
