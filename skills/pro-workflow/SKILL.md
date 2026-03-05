---
name: pro-workflow
description: Complete AI coding workflow system. Orchestration patterns, 18 hook events, 5 agents, cross-agent support, reference guides, and searchable learnings. Works with Claude Code, Cursor, and 32+ agents.
---

# Pro Workflow

Complete AI coding workflow system from production use. Orchestration patterns, reference guides, and battle-tested habits that compound over time.

**Works with:** Claude Code, Cursor, Codex, Gemini CLI, and 32+ AI coding agents via SkillKit. Sections marked *(Claude Code)* use features specific to Claude Code — Cursor users can skip those or use the noted alternatives.

## The Core Insight

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." — Karpathy

This skill optimizes for that ratio. Every pattern here reduces correction cycles.

---

## 1. The Self-Correction Loop

**The single most powerful pattern.** Your CLAUDE.md trains itself through corrections.

### How It Works

When you correct Claude:
1. Claude acknowledges the mistake
2. Proposes a rule to prevent it
3. You approve → rule goes into memory
4. Future sessions avoid the same mistake

### Add to CLAUDE.md

```markdown
## Self-Correction Protocol

When the user corrects me or I make a mistake:
1. Acknowledge specifically what went wrong
2. Propose a concise rule: `[LEARN] Category: One-line rule`
3. Wait for approval before adding to LEARNED section

### LEARNED
<!-- Auto-populated through corrections -->
```

### Trigger Phrases

- "Add that to your rules"
- "Remember this"
- "Don't do that again"

### Example Flow

```text
User: You edited the wrong file
Claude: I edited src/utils.ts when you meant src/lib/utils.ts.

[LEARN] Navigation: Confirm full path before editing files with common names.

Should I add this?
```

---

## 2. Parallel Sessions with Worktrees

**Zero dead time.** While one Claude thinks, work on something else.

### Setup

**Claude Code:**
```bash
claude --worktree    # or claude -w (auto-creates isolated worktree)
```

**Cursor / Any editor:**

```bash
git worktree add ../project-feat feature-branch
git worktree add ../project-fix bugfix-branch
```

### Background Agent Management *(Claude Code)*

- `Ctrl+F` — Kill all background agents (two-press confirmation)
- `Ctrl+B` — Send task to background
- Subagents support `isolation: worktree` in agent frontmatter

### When to Parallelize

| Scenario | Action |
|----------|--------|
| Waiting on tests | Start new feature in worktree |
| Long build | Debug issue in parallel |
| Exploring approaches | Try 2-3 simultaneously |

### Add to CLAUDE.md

```markdown
## Parallel Work
When blocked on long operations, use `claude -w` for instant parallel sessions.
Subagents with `isolation: worktree` get their own safe working copy.
```

---

## 3. The Wrap-Up Ritual

End sessions with intention. Capture learnings, verify state.

### /wrap-up Checklist

1. **Changes Audit** - List modified files, uncommitted changes
2. **State Check** - Run `git status`, tests, lint
3. **Learning Capture** - What mistakes? What worked?
4. **Next Session** - What's next? Any blockers?
5. **Summary** - One paragraph of what was accomplished

### Create Command

`~/.claude/commands/wrap-up.md`:

```markdown
Execute wrap-up checklist:
1. `git status` - uncommitted changes?
2. `npm test -- --changed` - tests passing?
3. What was learned this session?
4. Propose LEARNED additions
5. One-paragraph summary
```

---

## 4. Split Memory Architecture

For complex projects, modularize Claude memory.

### Structure

```text
.claude/
├── CLAUDE.md        # Entry point
├── AGENTS.md        # Workflow rules
├── SOUL.md          # Style preferences
└── LEARNED.md       # Auto-populated
```

### AGENTS.md

```markdown
# Workflow Rules

## Planning
Plan mode when: >3 files, architecture decisions, multiple approaches.

## Quality Gates
Before complete: lint, typecheck, test --related.

## Subagents
Use for: parallel exploration, background tasks.
Avoid for: tasks needing conversation context.
```

### SOUL.md

```markdown
# Style

- Concise over verbose
- Action over explanation
- Acknowledge mistakes directly
- No features beyond scope
```

---

## 5. The 80/20 Review Pattern

Batch reviews at checkpoints, not every change.

### Review Points

1. After plan approval
2. After each milestone
3. Before destructive operations
4. At /wrap-up

### Add to CLAUDE.md

```markdown
## Review Checkpoints
Pause for review at: plan completion, >5 file edits, git operations, auth/security code.
Between: proceed with confidence.
```

---

## 6. Model Selection

**Opus 4.6 and Sonnet 4.6** both support adaptive thinking and 1M-token context (as of 2025-08). The 1M context is available as a beta option (via the `context-1m-2025-08-07` beta header); the default context window remains 200K. Sonnet 4.5 (200K context) has been retired from the Max plan in favor of Sonnet 4.6. See [Models overview](https://docs.anthropic.com/en/docs/about-claude/models/overview) for current capabilities.

| Task | Model |
|------|-------|
| Quick fixes, exploration | Haiku 4.5 |
| Features, balanced work | Sonnet 4.6 |
| Refactors, architecture | Opus 4.6 |
| Hard bugs, multi-system | Opus 4.6 |

### Adaptive Thinking

Opus 4.6 and Sonnet 4.6 automatically calibrate reasoning depth per task — lightweight for simple operations, deep analysis for complex problems. No configuration needed. Extended thinking is built-in.

### Add to CLAUDE.md

```markdown
## Model Hints (as of 2025-08)
Opus 4.6 and Sonnet 4.6 auto-calibrate reasoning depth — no need to toggle thinking mode.
Use subagents with Haiku for fast read-only exploration, Sonnet 4.6 for balanced work.
Docs: https://docs.anthropic.com/en/docs/about-claude/models/overview
```

---

## 7. Context Discipline

200k tokens is precious. Manage it.

### Rules

1. Read before edit
2. Compact at task boundaries
3. Disable unused MCPs (<10 enabled, <80 tools)
4. Summarize explorations
5. Use subagents to isolate high-volume output (tests, logs, docs)

### Context Compaction

- Auto-compacts at ~95% capacity (keeps long-running agents alive)
- Configure earlier compaction: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50`
- Use PreCompact hooks to save state before compaction
- Subagents auto-compact independently from the main session

### Good Compact Points

- After planning, before execution
- After completing a feature
- When context >70%
- Before switching task domains

---

## 8. Learning Log

Auto-document insights from sessions.

### Add to CLAUDE.md

```markdown
## Learning Log
After tasks, note learnings:
`[DATE] [TOPIC]: Key insight`

Append to .claude/learning-log.md
```

---

## Learn Claude Code

Run `/learn` for a topic-by-topic guide covering sessions, context, CLAUDE.md, subagents, hooks, and more (see `commands/learn.md`). Official docs: **https://code.claude.com/docs/**

---

## Quick Setup

### Minimal

Add to your CLAUDE.md:

```markdown
## Pro Workflow

### Self-Correction
When corrected, propose rule → add to LEARNED after approval.

### Planning
Multi-file: plan first, wait for "proceed".

### Quality
After edits: lint, typecheck, test.

### LEARNED
```

### Full Setup

```bash
git clone https://github.com/rohitg00/pro-workflow.git /tmp/pw
cp -r /tmp/pw/templates/split-claude-md/* ./.claude/
cp -r /tmp/pw/commands/* ~/.claude/commands/
```

---

## Hooks *(Claude Code)*

Pro-workflow includes automated hooks to enforce the patterns. Cursor users get equivalent enforcement through `.mdc` rules in the `rules/` directory.

### PreToolUse Hooks

| Trigger | Action |
|---------|--------|
| Edit/Write | Track edit count, remind at 5/10 edits |
| git commit | Remind to run quality gates |
| git push | Remind about /wrap-up |

### PostToolUse Hooks

| Trigger | Action |
|---------|--------|
| Code edit (.ts/.js/.py/.go) | Check for console.log, TODOs, secrets |
| Test commands | Suggest [LEARN] from failures |

### Session Hooks

| Hook | Action |
|------|--------|
| SessionStart | Load LEARNED patterns, show worktree count |
| Stop | Context-aware reminders using `last_assistant_message` |
| SessionEnd | Check uncommitted changes, prompt for learnings |
| ConfigChange | Detect when quality gates or hooks are modified mid-session |

### Install Hooks

```bash
# Copy hooks to your settings
cp ~/skills/pro-workflow/hooks/hooks.json ~/.claude/settings.local.json

# Or merge with existing settings
```

### Hook Philosophy

Based on Twitter thread insights:
- **Non-blocking** - Hooks remind, don't block (except dangerous ops)
- **Checkpoint-based** - Quality gates at intervals, not every edit
- **Learning-focused** - Always prompt for pattern capture

---

## Contexts

Switch modes based on what you're doing.

| Context | Trigger | Behavior |
|---------|---------|----------|
| **dev** | "Let's build" | Code first, iterate fast |
| **review** | "Review this" | Read-only, security focus |
| **research** | "Help me understand" | Explore, summarize, plan |

Use: "Switch to dev mode" or load context file.

---

## Agents

Specialized subagents for focused tasks.

| Agent | Purpose | Tools |
|-------|---------|-------|
| **planner** | Break down complex tasks | Read-only |
| **reviewer** | Code review, security audit | Read + test |

### When to Delegate

Use planner agent when:
- Task touches >5 files
- Architecture decision needed
- Requirements unclear

Use reviewer agent when:
- Before committing
- PR reviews
- Security concerns

### Custom Subagents *(Claude Code)*

Create project-specific subagents in `.claude/agents/` or user-wide in `~/.claude/agents/`:
- Define with YAML frontmatter + markdown system prompt
- Control tools, model, permission mode, hooks, and persistent memory
- Use `/agents` to create, edit, and manage interactively
- Preload skills into subagents for domain knowledge

### Agent Teams *(Claude Code, Experimental)*

Coordinate multiple Claude Code sessions as a team:
- Enable: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- Lead session coordinates, teammates work independently
- Teammates message each other directly (not just report back)
- Shared task list with dependency management
- Display: in-process (`Shift+Down` to navigate, wraps around) or split panes (tmux/iTerm2)
- Delegate mode (Shift+Tab): lead coordinates only, no code edits
- Best for: parallel reviews, competing hypotheses, cross-layer changes
- **Docs:** https://code.claude.com/docs/agent-teams

---

## 9. Orchestration: Command > Agent > Skill

The most powerful pattern for complex features. Three layers, each with a single job.

### The Architecture

```text
Command (user-facing entry point)
  └── Agent (execution, constrained tools, preloaded skills)
        └── Skill (domain knowledge, injected at startup)
```

### Multi-Phase Development (/develop)

For features touching >5 files or needing architecture decisions:

1. **Research** → orchestrator agent explores codebase, scores confidence (0-100)
2. **Plan** → presents approach, files to change, risks. Waits for approval.
3. **Implement** → executes plan step by step with quality gates every 5 edits
4. **Review** → reviewer agent checks for security, logic, quality

Never skip phases. Never proceed without approval between phases.

### Agent Skills (Preloaded)

```yaml
# Agent frontmatter
skills: ["api-conventions", "project-patterns"]
```

Full skill content injected at agent startup. Use for knowledge the agent always needs.

### On-Demand Skills (Invoked)

Skills with `user-invocable: true` are called via `/skill-name`. Use `context: fork` for isolated execution that doesn't pollute main context.

### When to Orchestrate

| Scenario | Pattern |
|----------|---------|
| Feature > 5 files | `/develop` with orchestrator |
| Bug investigation | debugger agent |
| Quick exploration | scout agent (background) |
| Code review | reviewer agent |
| Simple task | Just do it directly |

---

## 10. Daily Habits

### Every Session
- Run `/doctor` if things feel off
- Manual `/compact` at 50% — don't wait for auto-compact
- `ultrathink` in prompts for maximum reasoning
- Name sessions with `/rename` for easy `/resume`
- End with `/wrap-up` to capture learnings

### Context Management
- CLAUDE.md: < 60 lines root, < 150 max
- Use `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` for proactive compaction
- Delegate heavy exploration to subagents
- Keep <10 MCPs, <80 tools

### Cross-Agent Tips
- Use Cursor for tab completions + Claude Code in terminal for hard problems
- Same MCP servers work across both (share `.mcp.json` at project root)
- SkillKit translates skills to any agent: `npx skillkit translate pro-workflow --agent cursor`

---

## MCP Config *(Claude Code)*

Start with 3 MCPs. Add only for concrete needs.

Essential:
- `context7` — Live documentation lookup
- `playwright` — Browser automation (most token-efficient)
- `github` — PRs, issues, code search

See `mcp-config.example.json` for setup and curated recommendations.

---

## Commands *(Claude Code)*

| Command | Purpose | Cursor Equivalent |
|---------|---------|-------------------|
| `/wrap-up` | End-of-session ritual | `wrap-up` skill |
| `/learn-rule` | Extract correction to memory | `learn-rule` skill |
| `/develop` | Multi-phase feature build | `orchestrate` skill |
| `/doctor` | Health check | — |
| `/commit` | Smart commit with quality gates | `smart-commit` skill |
| `/insights` | Session analytics and patterns | `insights` skill |
| `/replay` | Surface past learnings | `replay-learnings` skill |
| `/handoff` | Session handoff document | `session-handoff` skill |
| `/search` | Search learnings by keyword | — |
| `/list` | List all stored learnings | — |
| `/learn` | Topic-by-topic Claude Code guide | — |

---

## Reference Guides

Deep dives on configuration and features:

| Guide | Topics |
|-------|--------|
| `docs/settings-guide.md` | All settings keys, permission modes, hierarchy, sandbox, env vars |
| `docs/cli-cheatsheet.md` | Every CLI flag, keyboard shortcut, slash command |
| `docs/orchestration-patterns.md` | Command > Agent > Skill architecture, frontmatter reference |
| `docs/context-loading.md` | CLAUDE.md monorepo loading, agent memory, skills discovery |
| `docs/cross-agent-workflows.md` | Claude Code + Cursor config mapping, background agents |
| `docs/new-features.md` | Voice mode, agent teams, checkpointing, new hook events |
| `docs/daily-habits.md` | Session habits, debugging tips, terminal setup, anti-patterns |

---

## Philosophy

1. **Compound improvements** - Small corrections lead to big gains
2. **Trust but verify** - Let AI work, review at checkpoints
3. **Zero dead time** - Parallel sessions keep momentum
4. **Memory is precious** - Yours and the AI's
5. **Orchestrate, don't micromanage** - Wire patterns together, let agents execute

---

*Complete AI coding workflow system from production use across Claude Code, Cursor, and beyond.*
