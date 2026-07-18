---
name: skill-router
description: The index of every pro-workflow skill and command, grouped by job, with when to reach for each and whether it is human-run or auto-triggered. Use when you are not sure which skill fits, want the full map, or ask "what can this do", "which skill for X", "list the workflow".
user-invocable: true
---

# skill-router

You cannot hold 41 skills and 23 commands in your head. This is the index so you do not have to. Each entry says what it is for and how it fires: `[human]` you invoke it deliberately, `[auto]` the agent reaches for it from your prompt.

Keep this honest. When a skill is added, renamed, removed, or changes how it fits a flow, update this file in the same change. A router that points at a skill that no longer exists, or omits a new one, is worse than none.

## How to use it

State the job in one line. Match it to a group below. If two skills look close, the `when to reach` clause is the tiebreaker. Most skills have a matching slash command of the same name, so this index covers commands too.

## Self-correction and memory

- `learn-rule` `[human]` - capture a correction as a durable rule loaded on every future session.
- `replay-learnings` `[auto]` - surface past learnings relevant to the task before you start.
- `insights` `[human]` - correction trends, heatmaps, productivity view.
- `skill-optimizer` `[human]` - train a skill's SKILL.md against accumulated corrections.

## Planning and decisions

- `plan-interrogate` `[human]` - resolve every open decision before code; emits a decision ledger, a shared-language `CONTEXT.md`, and decision records.
- `domain-modeling` `[human]` - build the project's shared vocabulary and bounded contexts up front.
- `improve-architecture` `[human]` - audit an area and propose the smallest structural moves; plan, not rewrite.
- `thoroughness-scoring` `[auto]` - score each decision point 1-10 so effort tracks stakes.
- `orchestrate` `[human]` - wire commands, agents, and skills together for a multi-phase feature.

## Multi-agent and parallel work

- `agent-teams` `[human]` - lead plus teammates sharing one task list.
- `batch-orchestration` `[human]` - split a large change into independent units, one agent each.
- `parallel-worktrees` `[human]` - git worktrees for zero-dead-time parallel sessions.
- `sprint-status` `[human]` - status across active parallel sessions.

## Context and tokens

- `context-engineering` `[human]` - Write, Select, Compress, Isolate; the memory taxonomy.
- `context-optimizer` `[human]` - trim token usage when a session drags.
- `compact-guard` `[human]` - preserve critical state before compaction.
- `token-efficiency` `[auto]` - anti-sycophancy, tool-call budgets, one-pass output.
- `mcp-audit` `[human]` - audit MCP servers for token overhead, redundancy, security.

## Quality and review

- `tdd` `[human]` - red-green-refactor loop with good-test guidance.
- `deslop` `[auto]` - strip AI slop and over-engineering from the branch diff; also lints SKILL.md files.
- `smart-commit` `[human]` - quality gates, staged review, conventional commit.
- `llm-gate` `[auto]` - LLM-verified checks on commits, patterns, patches.
- `llm-council` `[human]` - multi-LLM deliberation on a hard call.
- `safe-mode` `[human]` - hook-enforced guard against destructive operations.

## Design and writing

- `design-engineering` `[auto]` - interface craft: motion decision framework, easing, timing, springs, component feel, visual foundations.
- `writing-guidelines` `[auto]` - clear-writing standards for docs, UI copy, error messages, commit and PR text.

## Knowledge and research

- `wiki-builder` `[human]` - start and grow a persistent FTS5-indexed wiki.
- `wiki-query` `[auto]` - BM25 retrieval over a wiki with citations.
- `wiki-research-loop` `[human]` - budget-capped auto-grow of a wiki.
- `wiki-viewer` `[human]` - self-contained HTML view of a wiki.
- `survey-generator` `[human]` - structured literature survey on a topic.

## Orientation, cost, lifecycle, setup

- `module-map` `[auto]` - one-screen map of an unfamiliar area.
- `bug-capture` `[auto]` - turn a reported defect into a domain-language issue.
- `cost-tracker` `[human]` - session cost and budget alerts.
- `permission-tuner` `[human]` - generate allow/deny rules from denial patterns.
- `wrap-up` `[human]` - end-of-session ritual: audit, persist learnings, handoff.
- `session-handoff` `[human]` - structured handoff doc for the next session.
- `file-watcher` `[human]` - hooks that react to config/env/dep changes.
- `auto-setup` `[human]` - configure gates, hooks, settings for a new project.
- `pro-workflow` `[auto]` - the system overview; orchestration patterns and reference.
- `skill-router` `[human]` - this index of every skill and command.

## Command-only (no matching skill)

These slash commands ship without a skill of the same name: `/commit`, `/develop`, `/doctor`, `/handoff`, `/learn`, `/list`, `/parallel`, `/replay`, `/search`, `/skill-optimize`, `/wiki`.

## Naming the invocation mode

Every skill declares one intent. `[human]` skills are deliberate, side-effectful, or session rituals and carry `user-invocable: true`. `[auto]` skills earn their place in context by a description precise enough to fire on the right prompt and stay quiet otherwise. See [`rules/skill-conventions.mdc`](../../rules/skill-conventions.mdc) for the full convention and the write-operation rules for state-changing skills.
