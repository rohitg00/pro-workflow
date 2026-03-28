# Agent Teams Quick Reference

Parallel agent execution for large tasks. Each teammate gets its own context window and can communicate directly.

## Setup

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Or in `~/.claude/settings.json`:
```json
{
  "experiments": {
    "agentTeams": true
  }
}
```

## Architecture

```text
Lead (Main Session)
  ├── assigns tasks ──→ Teammate A (own context)
  ├── assigns tasks ──→ Teammate B (own context)
  └── assigns tasks ──→ Teammate C (own context)
         ↕                    ↕
    direct messaging between teammates
```

The lead coordinates. Teammates work independently and can message each other or the lead.

## Task Decomposition

Split work along natural boundaries:

- **By layer**: frontend / backend / database / tests
- **By feature**: auth / payments / notifications
- **By phase**: research / implement / review
- **By file group**: components / API routes / utilities

Each teammate should be able to work without blocking on others. If tasks have serial dependencies, use phases instead of parallel teammates.

## Communication Patterns

### Shared Task List
Lead creates tasks, teammates pick them up and report completion. Best for independent work items.

### Direct Messaging (Mailbox)
Teammates send messages to each other. Best when one teammate's output feeds another's input.

### Shared Files
Teammates write to agreed-upon file paths. Last-write-wins, so coordinate who writes what.

## Hook Events for Teams

| Event | Fires When | Use For |
|-------|-----------|---------|
| `SessionStart` | Teammate spawns | Loading team-specific context |
| `Stop` | Teammate finishes | Collecting results |
| `Notification` | Message received | Routing messages between teammates |

## Decision Table

| Factor | Sub-agents | Agent Teams | Worktrees |
|--------|-----------|-------------|-----------|
| Context | Shared with parent | Independent windows | Independent sessions |
| Communication | Returns result only | Direct messaging + shared tasks | Git branches only |
| Duration | Short (< 5 min) | Long (minutes to hours) | Long (hours to days) |
| Isolation | Optional (`context: fork`) | Always isolated | Full git isolation |
| Coordination | Parent manages | Shared task list + mailbox | Manual (PRs) |
| Cost | Low (shared context) | Higher (N context windows) | Highest (N full sessions) |
| Best for | Quick lookups, exploration | Large features, multi-layer work | Multi-day projects, risky changes |

## When to Use What

**Sub-agents**: "Look up how auth works in this codebase" (quick, focused, returns answer)

**Agent Teams**: "Build the user preferences feature" (frontend + backend + tests in parallel)

**Worktrees**: "Refactor the payment system while the team ships other features" (days of work, needs isolation from main branch)

## Tips

- Start with 2-3 teammates. More than 4 creates coordination overhead.
- Give each teammate a clear, non-overlapping scope.
- The lead should check in after each major milestone, not micromanage.
- If teammates keep needing information from each other, the task split is wrong.
