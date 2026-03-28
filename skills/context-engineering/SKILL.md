---
name: context-engineering
description: Master the four operations of context engineering — Write, Select, Compress, Isolate. Manage token budgets, compaction strategies, and context partitioning to keep AI sessions sharp and efficient.
---

# Context Engineering

Four operations control everything about how context flows through an AI coding session. Master them and you control the quality of every response.

## The Four Operations

### 1. Write — Persist Info Outside Context

Move information out of the context window into durable storage so it survives compaction and session boundaries.

**Where to write:**

| Target | When | Example |
|--------|------|---------|
| CLAUDE.md | Permanent project rules | "Always use pnpm, never npm" |
| NOTES.md / scratchpad | Working state for current task | Architecture decisions, open questions |
| `.claude/memory/` | Learnings and patterns | `[LEARN]` rules from corrections |
| External files | Data too large for context | Test plans, migration checklists |

**Pattern — Scratchpad workflow:**
```text
1. Start complex task → create NOTES.md with goals and constraints
2. After research → write findings to NOTES.md
3. After compaction → NOTES.md survives, context does not
4. Resume → read NOTES.md to recover full state
```

### 2. Select — Retrieve Relevant Info

Pull the right information into context at the right time. Precision matters more than volume.

**Methods ranked by precision:**

1. `@file` references — exact file injection
2. `grep` / `Glob` — targeted pattern search
3. Subagent exploration — delegated deep search
4. RAG / embeddings — semantic retrieval for large codebases

**Key principle: Focused 300 tokens > unfocused 113K tokens.**

A surgical grep result that returns the exact function signature beats dumping an entire module into context. Every irrelevant token dilutes attention.

**Pattern — Progressive retrieval:**
```text
1. Start with file names (Glob)
2. Narrow to specific functions (Grep)
3. Read only the relevant lines (Read with offset+limit)
4. Never read entire large files when you need one function
```

### 3. Compress — Reduce Tokens, Preserve Signal

Shrink context without losing the information that matters.

**Compaction strategies:**

| Strategy | How | When |
|----------|-----|------|
| `/compact` with focus | `/compact focus: auth module changes` | Task boundaries |
| Microcompact | Ask Claude to summarize tool output inline | After large reads/searches |
| Head+tail | Read first 20 + last 20 lines of large output | Log analysis, test results |
| Tool result clearing | Subagent results auto-clear after reporting | Heavy exploration |
| Semantic selection | Summarize findings, discard raw data | Research phases |

**Compaction triggers:**

- After planning, before implementation
- After completing a feature or milestone
- When context exceeds 50% (set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50`)
- Before switching task domains
- After heavy search/read operations

**PostCompact hook — Re-inject critical context:**
```json
{
  "type": "PostCompact",
  "command": "cat .claude/critical-context.md"
}
```

Use this to ensure project rules, current task state, or architecture constraints survive every compaction.

### 4. Isolate — Partition Across Execution Spaces

Don't load everything into one context. Split work across independent execution spaces.

| Method | Isolation Level | Use When |
|--------|----------------|----------|
| Subagents | Forked context | Heavy exploration, test runs, doc generation |
| Worktrees (`claude -w`) | Full repo copy | Parallel features, competing approaches |
| `/btw` for side questions | Temporary fork | Quick questions without derailing main task |
| Agent teams | Independent sessions | Cross-layer changes, parallel reviews |
| Fresh session (`/resume`) | Clean slate | Unrelated work, degraded context |

**Pattern — Subagent delegation:**
```text
Main session: planning, coordination, commits
Subagent 1: explore auth module, report findings
Subagent 2: run test suite, report failures
Subagent 3: generate migration script
```

Main context stays clean. Subagents handle the volume.

## Context Budget Planning

Assume ~200K total window. Baseline overhead for a monorepo is ~20K tokens (CLAUDE.md, tool definitions, MCP schemas). Plan around **180K usable**.

| Allocation | Budget | What Goes Here |
|------------|--------|----------------|
| Static context | 20-30K | CLAUDE.md, tool schemas, MCP definitions |
| Dynamic context | 150-180K | Code, conversation, tool results |

**Put static context first.** CLAUDE.md and tool definitions load before conversation. Keeping them stable maximizes prompt cache hits — saves cost and latency.

| Phase | Target Usage | Action If Over |
|-------|-------------|----------------|
| Planning | < 20% | Keep plans concise, write to scratchpad |
| Implementation | < 50% | Compact between files, delegate reads |
| Testing | < 70% | Delegate test runs to subagents |
| Review | < 85% | Start fresh session if degraded |

## When to /clear vs /compact vs Subagent

| Situation | Action |
|-----------|--------|
| Task boundary, want to keep learnings | `/compact` with focus |
| Context degraded, Claude repeating itself | `/compact`, then `/resume` if still bad |
| Starting unrelated work | `/clear` or new session |
| Heavy read/search operation | Delegate to subagent |
| Quick side question | `/btw` (doesn't pollute main context) |
| Exploring multiple approaches | Worktrees or agent teams |

## Anti-Patterns

- Loading entire files when you need one function
- Keeping MCP tool results in context after extracting what you need
- Running 15+ MCPs (each adds tool schema overhead to every request)
- Vague prompts that force Claude to search broadly ("fix the code")
- Never compacting until auto-compact triggers at 95%

## Add to CLAUDE.md

```markdown
## Context Engineering

Write to NOTES.md for working state that must survive compaction.
Select with precision — grep first, read specific lines, never dump whole files.
Compact at 50% or task boundaries. Set CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50.
Isolate heavy work to subagents. Main session stays for coordination and commits.
```
