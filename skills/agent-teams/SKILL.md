---
name: agent-teams
description: Coordinate multiple Claude Code sessions as a team — lead + teammates with shared task lists, mailbox messaging, and file-lock claiming. Patterns for team sizing, task decomposition, and when to use teams vs sub-agents vs worktrees.
---

# Agent Teams

Coordinate multiple Claude Code sessions working on the same codebase simultaneously.

## Enable

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
claude  # starts as team lead
```

The first session becomes the team lead. Subsequent sessions in the same repo join as teammates.

## Architecture

```text
Team Lead (coordinates, delegates, reviews)
  ├── Teammate 1 (owns task A, messages lead + peers)
  ├── Teammate 2 (owns task B, messages lead + peers)
  └── Teammate 3 (owns task C, messages lead + peers)
      │
      └── Shared: task list + mailbox + file locks
```

**Key difference from subagents:** Teammates are full Claude Code sessions. They have their own context window, can use all tools, and message each other directly — not just report back to a parent.

## Team Sizing

| Team Size | Best For |
|-----------|----------|
| 2 | One builds, one reviews |
| 3-5 | Parallel features across layers (API, UI, tests) |
| > 5 | Coordination overhead outweighs parallelism |

3-5 teammates is the productive range. Beyond that, the lead spends more time coordinating than the team saves.

**Task granularity:** Aim for 5-6 tasks per teammate. Fewer means underutilization; more means excessive context switching.

## Display Modes

**In-process navigation:**
- `Shift+Down` — cycle through teammates (wraps around)
- See each teammate's current task and output

**Split-pane (recommended for >2 teammates):**
- tmux: `tmux split-window -h` per teammate
- iTerm2: Cmd+D for vertical split
- Each pane runs its own `claude` session

## Task Management

Tasks flow through states:

```text
pending → in-progress → completed
              │
              └── blocked (waiting on dependency)
```

### Task Decomposition

Break work into units that:
- Touch non-overlapping files
- Can be verified independently
- Have clear done criteria

**Good decomposition:**
```text
Task 1: Add rate limiting middleware (src/middleware/rate-limit.ts)
Task 2: Add rate limit tests (tests/rate-limit.test.ts)
Task 3: Update API docs for rate limit headers (docs/api.md)
Task 4: Add Redis config for rate limit store (src/config/redis.ts)
```

**Bad decomposition:**
```text
Task 1: Implement rate limiting
Task 2: Fix rate limiting bugs
Task 3: Improve rate limiting
```

### Dependencies

Tasks can declare dependencies:
```text
Task 3 (API docs) → depends on Task 1 (middleware)
Task 2 (tests) → depends on Task 1 (middleware)
Task 4 (Redis config) → no dependencies
```

Teammates pick up unblocked tasks automatically.

## File-Lock Claiming

Teammates claim files before editing to prevent conflicts:

1. Teammate checks if file is locked
2. If free, claims it (file-lock-based)
3. Edits the file
4. Releases lock on task completion

If two teammates need the same file, one waits or the lead reassigns.

## Plan Approval

Teammates plan before implementing:

1. Teammate receives task
2. Writes a brief plan (files to change, approach)
3. Lead reviews plan
4. Lead approves or redirects
5. Teammate implements

This prevents wasted work from misunderstood requirements.

## Delegate Mode

`Shift+Tab` toggles delegate mode for the lead:
- Lead coordinates only — no direct code edits
- All implementation delegated to teammates
- Lead reviews, approves plans, manages task flow

## Hook Events

| Hook | Fires When |
|------|------------|
| TeammateIdle | A teammate finishes its task and has no pending work |
| TaskCreated | New task added to the shared list |
| TaskCompleted | A teammate marks a task done |

Use these to trigger notifications, auto-assign next tasks, or run integration tests when all tasks complete.

## When to Use Teams vs Alternatives

| Scenario | Use |
|----------|-----|
| Parallel work on non-overlapping files | Agent teams |
| Quick background exploration | Subagent |
| Isolated feature branch work | Worktree (`claude -w`) |
| Competing approaches to same problem | Worktrees (compare results) |
| Cross-layer changes (API + UI + tests) | Agent teams |
| One-off delegation | Subagent with `isolation: worktree` |
| Large-scale migration (20+ files) | `/batch` command |

## Anti-Patterns

- More than 5 teammates — coordination overhead dominates
- Tasks that share mutable state or the same files
- Skipping plan approval — leads to rework
- Lead doing implementation instead of coordinating (use delegate mode)
- Not setting dependencies — teammates race on coupled tasks

## Example Session

```text
Lead: "We need rate limiting. Breaking into 4 tasks."

  Task 1: middleware implementation → Teammate 1
  Task 2: Redis config → Teammate 2 (no deps)
  Task 3: tests → Teammate 1 (after Task 1)
  Task 4: API docs → Teammate 2 (after Task 1)

Teammate 1 plans → Lead approves → implements Task 1
Teammate 2 plans → Lead approves → implements Task 2
Task 1 completes → unblocks Tasks 3 and 4
Teammate 1 picks up Task 3, Teammate 2 picks up Task 4
All complete → Lead runs integration tests → commits
```

## Docs

https://code.claude.com/docs/agent-teams
