# Modern Workflows

The power-user loop shifted from single-session prompting to orchestrating many agents and routing work by role. These patterns layer on top of the eight core pro-workflow patterns; they are what "optimized for today" looks like.

## Agent = Model + Harness

Frontier models converged. The wrapper decides your experience now: hooks, memory, review loops, effort routing, and orchestration. Every pattern below spends its budget on the harness, not on chasing a bigger model. See [`models-2026.md`](models-2026.md) for the tier and effort routing that underpins these.

## Multi-agent orchestration

The loudest 2026 shift: stop running one agent, start running a fleet.

- **Role separation.** One agent plans, a second implements, a third reviews. A fresh reviewer catches requirement misreads that the planner baked in. Wire this onto the existing `orchestrator` and `reviewer` agents.
- **Fan-out at scale.** Spin up N agents against independent workstreams (files, tests, candidates) and collect. The bottleneck becomes coordination, not compute - which is what the next two patterns solve. Pair with `parallel-worktrees` so parallel agents do not collide on the working tree.
- **Model + effort routing per agent.** Grunt agents (search, fetch, scan) run Haiku at `low` effort; the reasoning agent runs Opus/Sonnet at `high`/`xhigh`. This is the single biggest cost lever in a fleet.

## Agent Teams

When workers must coordinate mid-task, independent subagents are not enough. Agent Teams share a task list and message each other directly.

- Use **subagents** when the tasks are independent (fan-out, isolated reads).
- Use **Agent Teams** when the workers need to hand off, react to each other, or converge on a shared list.

## Checkpoints

State is snapshotted automatically before changes, so an agent run can be rewound instead of manually reverted. Treat a checkpoint as the cheap undo that lets a fleet take bigger swings - it lowers the cost of a bad autonomous step.

## Backgrounded commands

Long-running shell commands run detached; the agent is notified on completion and polls output without blocking the conversation. Use this for builds, test suites, and watchers so the main loop keeps moving while work runs.

## Context management for long runs

Long-horizon runs exhaust context. Three levers, often used together:

- **Compaction** - summarizes earlier history server-side as you approach the window.
- **Context editing** - clears stale tool results and thinking blocks without summarizing.
- **Memory** - persists learnings across sessions to a file the agent re-reads. This maps directly onto the Split Memory pattern (`AGENTS.md` / `SOUL.md` / `LEARNED.md`).

## Skills and commands unified

Slash commands and skills merged. Files under `commands/` still work, but skills-first is the recommended shape: a skill gets a `/slash` interface plus autonomous invocation and can carry helper files. Plugins remain the distribution layer - a versioned bundle of skills, subagents, commands, and hooks installed with one command. Rule of thumb: prompt template -> command; real logic or helper files -> skill; isolated parallel work -> subagent; enforce a rule with code -> hook.

## Interop: MCP everywhere, ACP between agents

- **MCP** is now universal across the major agents - one server works across all of them with the same setup. Audit yours with `mcp-audit`.
- **ACP (Agent Client Protocol)** is the emerging agent-to-IDE standard: it lets different agents run inside the same host. Portable config beats per-tool lock-in - keep skills and rules translatable rather than pinned to one agent.

## Context-file craft

The cheapest high-leverage upgrade people share is a well-tuned single context file that makes the agent stop guessing and ask when unclear. This is the `self-correction` and Split Memory story - invest in the context file before reaching for heavier machinery.
