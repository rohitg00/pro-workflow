# Pro Workflow

[![GitHub stars](https://img.shields.io/github/stars/rohitg00/pro-workflow?style=social)](https://github.com/rohitg00/pro-workflow)
[![npm version](https://img.shields.io/npm/v/pro-workflow)](https://www.npmjs.com/package/pro-workflow)

Battle-tested Claude Code workflows from power users. Self-correcting memory, parallel worktrees, wrap-up rituals, and the 80/20 AI coding ratio.

**v1.1.0: Agent teams, custom subagents, adaptive thinking, smart commit, and session insights!**

**If this helps your workflow, please give it a star!**

## What's New in v1.1.0

- **`/commit`**: Smart commit with quality gates, code review, and learning capture
- **`/insights`**: Session analytics, learning patterns, correction trends, and productivity metrics
- **Agent Teams**: Coordinate multiple Claude Code sessions with shared task lists and inter-agent messaging
- **Custom Subagents**: Create project or user-level subagents with custom tools, memory, and hooks
- **Adaptive Thinking**: Opus 4.6 calibrates reasoning depth per task automatically
- **Context Compaction**: Keep long-running agents alive with auto-compaction and PreCompact hooks
- **Updated Model Selection**: Haiku 4.5, Sonnet 4.5, Opus 4.6 model recommendations
- **Persistent Storage**: Learnings survive reboots in `~/.pro-workflow/data.db`
- **Full-Text Search**: Find past learnings instantly with BM25-powered FTS5

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

### One-Click Plugin Install (Recommended)

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

### Build with SQLite Support

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

## Commands

After plugin install, commands are namespaced:

| Command | Purpose |
|---------|---------|
| `/pro-workflow:wrap-up` | End-of-session checklist |
| `/pro-workflow:learn-rule` | Extract correction to memory (file-based) |
| `/pro-workflow:parallel` | Worktree setup guide |
| `/pro-workflow:learn` | **NEW** Claude Code best practices & save learnings |
| `/pro-workflow:search` | **NEW** Search learnings by keyword |
| `/pro-workflow:list` | **NEW** List all stored learnings |
| `/pro-workflow:commit` | **NEW** Smart commit with quality gates and code review |
| `/pro-workflow:insights` | **NEW** Session analytics and learning patterns |

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
├── .claude-plugin/
│   ├── plugin.json           # Plugin manifest
│   ├── marketplace.json      # Marketplace config
│   └── README.md
├── src/                      # TypeScript source
│   ├── db/
│   │   ├── index.ts          # Database initialization
│   │   ├── store.ts          # Stateless store factory
│   │   └── schema.sql        # SQLite schema with FTS5
│   ├── search/
│   │   └── fts.ts            # BM25 search helpers
│   └── index.ts
├── dist/                     # Compiled JavaScript
├── skills/
│   └── pro-workflow/
│       └── SKILL.md          # Main skill
├── agents/
│   ├── planner.md            # Planner agent
│   └── reviewer.md           # Reviewer agent
├── commands/
│   ├── wrap-up.md
│   ├── learn-rule.md
│   ├── parallel.md
│   ├── learn.md
│   ├── search.md
│   ├── list.md
│   ├── commit.md
│   └── insights.md
├── hooks/
│   └── hooks.json # Hooks file
├── scripts/                  # Hook scripts
├── contexts/
│   ├── dev.md # Dev context
│   ├── review.md # Review context
│   └── research.md # Research context
├── references/
│   └── claude-code-resources.md # Claude code resources reference file
├── rules/
│   └── core-rules.md # Core rules file
├── templates/
│   └── split-claude-md/ # Split claude md template
├── package.json
├── tsconfig.json # TypeScript configuration file
└── README.md # README file
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
