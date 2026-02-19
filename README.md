# Pro Workflow

[![GitHub stars](https://img.shields.io/github/stars/rohitg00/pro-workflow?style=social)](https://github.com/rohitg00/pro-workflow)
[![npm version](https://img.shields.io/npm/v/pro-workflow)](https://www.npmjs.com/package/pro-workflow)

Battle-tested AI coding workflows from power users. Self-correcting memory, parallel worktrees, wrap-up rituals, and the 80/20 AI coding ratio. Works with **Claude Code** and **Cursor**.

**v1.2.0: Scout agent, /replay, /handoff, drift detection, adaptive quality gates, and correction heatmap!**

**If this helps your workflow, please give it a star!**

## What's New in v1.2.0

- **Scout Agent**: Confidence-gated exploration — scores readiness (0-100) before implementation, auto-gathers missing context
- **`/replay`**: Surface relevant past learnings before starting a task — your SQLite-powered coding muscle memory
- **`/handoff`**: Generate structured session handoff documents for seamless continuation in the next session
- **Drift Detection**: Hook that tracks your original intent and warns when you've strayed from the goal
- **Adaptive Quality Gates**: Gates adjust based on your correction history — high correction rate = tighter gates, low rate = relaxed gates
- **Correction Heatmap**: `/insights heatmap` shows which categories and projects get corrected most, with hot/cold learning analysis

### Previous: v1.1.0

- Smart `/commit` with quality gates, `/insights` analytics, agent teams, persistent SQLite storage with FTS5

## The Core Idea

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." — Karpathy

This skill optimizes for that ratio. Every pattern reduces correction cycles.

## Patterns

| Pattern | What It Does |
|---------|--------------|
| **Self-Correction Loop** | Claude learns from your corrections automatically |
| **Parallel Worktrees** | Zero dead time - work while Claude thinks |
| **Wrap-Up Ritual** | End sessions with intention, capture learnings |
| **Split Memory** | Modular CLAUDE.md for complex projects |
| **80/20 Review** | Batch reviews at checkpoints |
| **Model Selection** | Opus+Thinking for one-shot accuracy |
| **Context Discipline** | Manage your 200k token budget |
| **Learning Log** | Auto-document insights |

## Installation

### Cursor (Recommended)

```bash
/add-plugin pro-workflow
```

The plugin includes 9 skills, 3 agents, and 6 rules that load automatically.

### Claude Code — One-Click Plugin Install

```bash
# Add marketplace
/plugin marketplace add rohitg00/pro-workflow

# Install plugin
/plugin install pro-workflow@pro-workflow
```

Or via CLI:

```bash
claude plugin marketplace add rohitg00/pro-workflow
claude plugin install pro-workflow@pro-workflow
```

### Claude Code — Build with SQLite Support

After installation, build the TypeScript for persistent storage:

```bash
cd ~/.claude/plugins/*/pro-workflow  # Navigate to plugin directory
npm install && npm run build
```

This creates the SQLite database at `~/.pro-workflow/data.db`.

### Or load directly

```bash
claude --plugin-dir /path/to/pro-workflow
```

### Manual Setup

```bash
git clone https://github.com/rohitg00/pro-workflow.git /tmp/pw
cp -r /tmp/pw/templates/split-claude-md/* ./.claude/
cp -r /tmp/pw/commands/* ~/.claude/commands/
cp -r /tmp/pw/hooks/* ~/.claude/
```

### Minimal (Just add to CLAUDE.md)

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

## Skills (Cursor)

| Skill | Description |
|:------|:------------|
| `pro-workflow` | Core 8 workflow patterns for AI-assisted coding |
| `smart-commit` | Quality gates, staged review, and conventional commits |
| `wrap-up` | End-of-session ritual with change audit and learning capture |
| `learn-rule` | Capture corrections as persistent learning rules |
| `parallel-worktrees` | Set up git worktrees for zero dead time |
| `replay-learnings` | Surface past learnings relevant to the current task |
| `session-handoff` | Generate handoff documents for session continuity |
| `insights` | Session analytics, correction trends, and productivity metrics |
| `deslop` | Remove AI-generated code slop and clean up style |

## Rules (Cursor)

| Rule | Applies To | Description |
|:-----|:-----------|:------------|
| `quality-gates` | Always | Lint, typecheck, and test before commits |
| `atomic-commits` | Always | Conventional format, feature branches, specific staging |
| `context-discipline` | Always | Read before edit, plan before multi-file changes |
| `self-correction` | Always | Capture mistakes as compounding learnings |
| `no-debug-statements` | `*.{ts,tsx,js,jsx,py,go,rs}` | Remove console.log, debugger, print before committing |
| `communication-style` | Always | Concise, action-oriented, no over-engineering |

## Commands (Claude Code)

After plugin install, commands are namespaced:

| Command | Purpose |
|---------|---------|
| `/pro-workflow:wrap-up` | End-of-session checklist |
| `/pro-workflow:learn-rule` | Extract correction to memory (file-based) |
| `/pro-workflow:parallel` | Worktree setup guide |
| `/pro-workflow:learn` |Claude Code best practices & save learnings |
| `/pro-workflow:search` |Search learnings by keyword |
| `/pro-workflow:list` |List all stored learnings |
| `/pro-workflow:commit` | Smart commit with quality gates and code review |
| `/pro-workflow:insights` | Session analytics, learning patterns, and correction heatmap |
| `/pro-workflow:replay` |Surface past learnings for current task |
| `/pro-workflow:handoff` |Generate session handoff document for next session |

## Database Features

### Persistent Learnings

Learnings are stored in SQLite with FTS5 full-text search:

```
~/.pro-workflow/
└── data.db    # SQLite database with learnings and sessions
```

### Search Examples

```
/search testing           # Find all testing-related learnings
/search "file paths"      # Exact phrase search
/search git commit        # Multiple terms
```

### Learning Categories

- Navigation (file paths, finding code)
- Editing (code changes, patterns)
- Testing (test approaches)
- Git (commits, branches)
- Quality (lint, types, style)
- Context (when to clarify)
- Architecture (design decisions)
- Performance (optimization)
- Claude-Code (sessions, modes, CLAUDE.md, skills, subagents, hooks, MCP)
- Prompting (scope, constraints, acceptance criteria)

## Hooks

Automated enforcement of workflow patterns.

| Hook | When | What |
|------|------|------|
| PreToolUse | Before edits | Track edit count, quality gate reminders |
| PreToolUse | Before git commit/push | Remind about quality gates, wrap-up |
| PostToolUse | After code edits | Check for console.log, TODOs, secrets |
| PostToolUse | After tests | Suggest [LEARN] from failures |
| UserPromptSubmit | Each prompt |Drift detection — warns when straying from original intent |
| SessionStart | New session | Load learnings from database |
| Stop | Each response | Periodic wrap-up reminders |
| SessionEnd | Session close | Save session stats to database |

### Install Hooks

```bash
# Full setup with hooks
git clone https://github.com/rohitg00/pro-workflow.git /tmp/pw
cp -r /tmp/pw/hooks/* ~/.claude/
cp -r /tmp/pw/scripts ~/.claude/scripts/pro-workflow/
cp -r /tmp/pw/commands/* ~/.claude/commands/
```

## Contexts & Agents

| Context | When | Behavior |
|---------|------|----------|
| dev | Building | Code first, iterate |
| review | PRs | Read-only, security focus |
| research | Exploring | Summarize, plan |

| Agent | Purpose |
|-------|---------|
| planner | Break down complex tasks |
| reviewer | Code review, security audit |
| scout |Confidence-gated exploration before implementation |

### Agent Teams (Experimental)

Coordinate multiple Claude Code sessions working together:

```bash
# Enable in settings.json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

- Lead session coordinates, teammates work independently
- Teammates message each other directly
- Shared task list with dependency management
- Display modes: in-process (`Shift+Up/Down`) or split panes (tmux/iTerm2)
- Delegate mode (`Shift+Tab`): lead orchestrates only
- Docs: https://code.claude.com/docs/agent-teams

## Structure

```
pro-workflow/
├── .claude-plugin/              # Claude Code plugin
│   ├── plugin.json
│   ├── marketplace.json
│   └── README.md
├── .cursor-plugin/              # Cursor plugin
│   └── plugin.json
├── skills/                      # Shared skills (Cursor + Claude Code)
│   ├── pro-workflow/SKILL.md
│   ├── smart-commit/SKILL.md
│   ├── wrap-up/SKILL.md
│   ├── learn-rule/SKILL.md
│   ├── parallel-worktrees/SKILL.md
│   ├── replay-learnings/SKILL.md
│   ├── session-handoff/SKILL.md
│   ├── insights/SKILL.md
│   └── deslop/SKILL.md
├── agents/                      # Shared agents (Cursor + Claude Code)
│   ├── planner.md
│   ├── reviewer.md
│   └── scout.md
├── rules/                       # Rules
│   ├── core-rules.md            # Claude Code rules
│   ├── quality-gates.mdc        # Cursor rules
│   ├── atomic-commits.mdc
│   ├── context-discipline.mdc
│   ├── self-correction.mdc
│   ├── no-debug-statements.mdc
│   └── communication-style.mdc
├── commands/                    # Claude Code commands
│   ├── wrap-up.md
│   ├── learn-rule.md
│   ├── commit.md
│   ├── insights.md
│   ├── replay.md
│   ├── handoff.md
│   └── ...
├── hooks/                       # Claude Code hooks
│   └── hooks.json
├── scripts/                     # Hook scripts
├── contexts/                    # Context modes
│   ├── dev.md
│   ├── review.md
│   └── research.md
├── src/                         # TypeScript source (SQLite)
│   ├── db/
│   └── search/
├── assets/
│   └── logo.svg                 # Plugin logo
├── package.json
├── tsconfig.json
└── README.md
```

## Learn Claude Code

Pro-workflow teaches Claude Code best practices directly, with links to official documentation for deep dives.

**Official Docs:** https://code.claude.com/docs/

Topics covered: sessions, context management, modes, CLAUDE.md, prompting, writing rules, skills, subagents, hooks, MCP, security, and IDE integration.

```
/pro-workflow:learn                 # Best practices guide & save learnings
/pro-workflow:learn-rule            # Capture corrections to memory
/pro-workflow:search claude-code    # Find past Claude Code learnings
```

## SkillKit - Universal AI Skills

**One skill. 32+ AI coding agents.** Install pro-workflow across Claude Code, Cursor, Codex, Gemini CLI, and more with [SkillKit](https://agenstskills.com).

```bash
# Install this skill
npx skillkit install pro-workflow

# Translate to any agent format
npx skillkit translate pro-workflow --agent cursor

# Get AI-powered skill recommendations
npx skillkit primer
```

**Why SkillKit?**
- Install once, use everywhere
- 15,000+ skills in the marketplace
- Works with Claude Code, Cursor, Codex, Gemini CLI, Windsurf, and 27+ more agents

Explore the marketplace at [agenstskills.com](https://agenstskills.com)

## Philosophy

1. **Compound improvements** - Small corrections → big gains over time
2. **Trust but verify** - Let AI work, review at checkpoints
3. **Zero dead time** - Parallel sessions keep momentum
4. **Memory is precious** - Both yours and Claude's

---

## Support

If you find this useful:
- **Star this repo** to help others discover it
- Check out [SkillKit](https://agenstskills.com) for more AI coding skills
- [Report issues](https://github.com/rohitg00/pro-workflow/issues) or suggest improvements

---

*Distilled from Claude Code power users and real production use.*
