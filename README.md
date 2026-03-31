<p align="center">
  <img src="assets/banner.svg" alt="Pro Workflow" width="100%"/>
</p>

<p align="center">
  <a href="https://github.com/rohitg00/pro-workflow/stargazers"><img src="https://img.shields.io/github/stars/rohitg00/pro-workflow?style=for-the-badge&logo=github&color=D97757&labelColor=1e1e2e" alt="Stars"/></a>
  <a href="https://www.npmjs.com/package/pro-workflow"><img src="https://img.shields.io/npm/v/pro-workflow?style=for-the-badge&logo=npm&color=E8926F&labelColor=1e1e2e" alt="npm"/></a>
  <a href="https://github.com/rohitg00/pro-workflow/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge&labelColor=1e1e2e" alt="License"/></a>
  <a href="https://agenstskills.com"><img src="https://img.shields.io/badge/SkillKit-32%2B%20agents-f59e0b?style=for-the-badge&labelColor=1e1e2e" alt="SkillKit"/></a>
  <a href="https://rohitg00-pro-workflow.mintlify.app/"><img src="https://img.shields.io/badge/Docs-Mintlify-0D9373?style=for-the-badge&logo=mintlify&labelColor=1e1e2e" alt="Docs"/></a>
</p>

<h3 align="center">Your Claude Code gets smarter every session.</h3>

<p align="center">
  Self-correcting memory that compounds over 50+ sessions. You correct Claude once &mdash; it never makes the same mistake again.<br/>
  Works with <b>Claude Code</b>, <b>Cursor</b>, and <b>32+ agents</b> via SkillKit.
</p>

---

## The Problem

You correct Claude the same way 50 times. You tell it "don't mock the database" on Monday and again on Friday. You explain your project conventions every new session. Context compacts, learnings vanish, mistakes repeat.

**Every Claude Code user hits this wall.**

## The Solution

Pro Workflow captures every correction in a persistent SQLite database with full-text search. Corrections compound into rules. Rules load automatically on session start. After 50 sessions, Claude barely needs correcting.

<p align="center">
  <img src="assets/self-correction-demo.svg" alt="Self-Correction Loop" width="700"/>
</p>

```
Session 1:  You → "Don't mock the database in tests"
            Claude → Proposes rule → You approve → Saved to SQLite

Session 2:  SessionStart hook loads all learnings
            Claude → Writes integration tests (no mocks)
            You → Zero corrections needed

Session 50: Claude knows your conventions, style, and preferences
            Correction rate: near zero
```

## Install (30 seconds)

```bash
/plugin marketplace add rohitg00/pro-workflow
/plugin install pro-workflow@pro-workflow
```

<details>
<summary>Other install methods</summary>

```bash
# Cursor
/add-plugin pro-workflow

# Any agent via SkillKit
npx skillkit install pro-workflow

# Manual
git clone https://github.com/rohitg00/pro-workflow.git /tmp/pw
cp -r /tmp/pw/templates/split-claude-md/* ./.claude/

# Build with SQLite support
cd ~/.claude/plugins/*/pro-workflow && npm install && npm run build
```

</details>

## Try It

```bash
/develop add user authentication     # Multi-phase: Research → Plan → Implement → Review
/wrap-up                             # End session, capture learnings, audit changes
/doctor                              # Check your setup health
/learn-rule                          # Extract a correction into persistent memory
/commit                              # Quality gates → staged review → conventional commit
```

---

## What's Inside

### 17 Skills

| Skill | What It Does |
|:------|:------------|
| **Self-Correction Loop** | Claude learns from your corrections automatically |
| **Context Engineering** | Write/Select/Compress/Isolate framework for token management |
| **Agent Teams** | Multi-instance coordination with shared task list and messaging |
| **Batch Orchestration** | `/batch` pattern for parallel worktree agents |
| **Parallel Worktrees** | Zero dead time with native `claude -w` worktrees |
| **Smart Commit** | Quality gates, staged review, and conventional commits |
| **Wrap-Up Ritual** | End sessions with intention, capture learnings |
| **Context Optimizer** | Token management, context budget, MCP audit |
| **Deslop** | Remove AI-generated code slop and clean up style |
| **Orchestrate** | Wire Commands, Agents, and Skills for multi-phase development |
| **Session Handoff** | Generate handoff documents for session continuity |
| **Replay Learnings** | Surface past learnings relevant to the current task |
| **Insights** | Session analytics, correction trends, productivity metrics |
| **Safe Mode** | Guardrails for destructive operations |
| **Sprint Status** | Track progress across sessions |
| **Thoroughness Scoring** | Rate completeness of implementations |
| **Learn Rule** | Capture corrections as persistent learning rules |

### 6 Agents

| Agent | Purpose |
|-------|---------|
| **planner** | Break down complex tasks (read-only, approval-gated) |
| **reviewer** | Code review and security audit (checklist-based) |
| **scout** | Confidence-gated exploration (background, worktree-isolated) |
| **orchestrator** | Multi-phase feature development (Research > Plan > Implement > Review) |
| **debugger** | Systematic bug investigation (hypothesis-driven) |
| **context-engineer** | Context window analysis and optimization (lightweight, read-only) |

### 16 Commands

| Command | What It Does |
|---------|-------------|
| `/develop` | Multi-phase feature build with validation gates |
| `/commit` | Smart commit with quality gates |
| `/wrap-up` | End-of-session checklist and learning capture |
| `/learn-rule` | Extract correction to persistent memory |
| `/doctor` | Health check for setup and configuration |
| `/insights` | Session analytics and correction heatmap |
| `/replay` | Surface past learnings for current task |
| `/handoff` | Generate session handoff document |
| `/search` | Search learnings by keyword |
| `/list` | List all stored learnings |
| `/deslop` | Remove AI-generated code slop from diff |
| `/context-optimizer` | Audit and optimize context window usage |
| `/parallel` | Set up git worktrees for parallel sessions |
| `/learn` | Interactive Claude Code best practices guide |
| `/safe-mode` | Toggle destructive operation guardrails |
| `/sprint-status` | Track multi-session progress |

### 23 Hook Scripts (18 Events)

| Hook | When | What |
|------|------|------|
| SessionStart | New session | Load learnings from database |
| UserPromptSubmit | Each prompt | Drift detection, correction tracking |
| PreToolUse | Before edits | Track edit count, quality gate reminders |
| PreToolUse | Before git | Remind about quality gates |
| PostToolUse | After edits | Check for console.log, TODOs, secrets |
| PostToolUse | After tests | Suggest learning from failures |
| Stop | Each response | Context-aware reminders |
| SessionEnd | Session close | Save session stats to database |
| PreCompact | Before compaction | Save context state |
| PostCompact | After compaction | Re-inject critical context summary |
| SubagentStart/Stop | Agent lifecycle | Log and collect results |
| TaskCompleted | Task done | Quality gate on completion |
| PermissionRequest | Permission dialog | Flag dangerous operations |
| PostToolUseFailure | Tool fails | Track failures, suggest learnings |
| TeammateIdle | Teammate idle | Detect blockers in agent teams |
| StopFailure | API error | Log errors with retry advice |
| FileChanged | Config modified | Watch package.json, .env, CI |
| ConfigChange | Settings change | Detect mid-session changes |

### 10 Reference Guides

| Guide | What's Covered |
|-------|---------------|
| [`settings-guide.md`](docs/settings-guide.md) | All settings keys, permission modes, hierarchy |
| [`cli-cheatsheet.md`](docs/cli-cheatsheet.md) | Every CLI flag, keyboard shortcut, slash command |
| [`orchestration-patterns.md`](docs/orchestration-patterns.md) | Command > Agent > Skill architecture, agent teams |
| [`context-engineering.md`](docs/context-engineering.md) | Write/Select/Compress/Isolate, memory taxonomy, compaction |
| [`agent-teams.md`](docs/agent-teams.md) | Setup, task decomposition, teams vs sub-agents |
| [`context-loading.md`](docs/context-loading.md) | CLAUDE.md loading, agent memory, skills discovery |
| [`cross-agent-workflows.md`](docs/cross-agent-workflows.md) | Claude Code + Cursor together, SkillKit translation |
| [`new-features.md`](docs/new-features.md) | Voice, agent teams, checkpointing, remote control |
| [`daily-habits.md`](docs/daily-habits.md) | Session habits, debugging tips, anti-patterns |
| [`core-rules.md`](rules/core-rules.md) | Quality gates, atomic commits, context discipline |

---

## How It Works

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." &mdash; Karpathy

> "The bottleneck was never the model. It was always the workflow." &mdash; @getvibecodes

Pro Workflow optimizes for that ratio. Every correction becomes a rule. Every rule prevents future mistakes. The loop compounds.

### The `/develop` Flow

<p align="center">
  <img src="assets/workflow-flow.svg" alt="Development Flow" width="900"/>
</p>

Multi-phase development with validation gates: Research before planning. Plan before implementing. Review before committing.

### Architecture

<p align="center">
  <img src="assets/architecture.svg" alt="Architecture Diagram" width="900"/>
</p>

### Database

Learnings stored in SQLite with FTS5 full-text search:

```bash
/search testing           # Find all testing-related learnings
/search "file paths"      # Exact phrase search
/list                     # Show all stored learnings
```

---

## Core Patterns

| Pattern | What It Does |
|---------|--------------|
| **Self-Correction Loop** | Claude learns from your corrections automatically |
| **Parallel Worktrees** | Zero dead time with native `claude -w` worktrees |
| **Wrap-Up Ritual** | End sessions with intention, capture learnings |
| **Split Memory** | Modular CLAUDE.md for complex projects |
| **80/20 Review** | Batch reviews at checkpoints |
| **Context Engineering** | Write/Select/Compress/Isolate for token management |
| **Agent Teams** | Multi-instance coordination with shared task list |
| **Batch Orchestration** | Parallel worktree agents for large-scale changes |
| **Multi-Phase Dev** | Research > Plan > Implement > Review with gates |
| **Learning Log** | Auto-document insights |
| **Orchestration** | Command > Agent > Skill wiring for complex features |

---

## Cross-Agent Support

Works across 32+ AI coding agents via [SkillKit](https://agenstskills.com):

```bash
npx skillkit install pro-workflow
npx skillkit translate pro-workflow --agent cursor
npx skillkit translate pro-workflow --agent codex
npx skillkit translate pro-workflow --agent gemini-cli
```

Supported: Claude Code, Cursor, Codex CLI, Gemini CLI, Windsurf, OpenCode, Kiro, Amp, Goose, Roo, and [27 more](https://agenstskills.com).

---

## Configuration

### Settings

See [`settings.example.json`](settings.example.json) for production-ready configuration including permission rules, output style, auto-compaction, and custom spinner verbs.

### MCP Config

See [`mcp-config.example.json`](mcp-config.example.json) for curated server recommendations:
- **context7** &mdash; Live documentation lookup
- **playwright** &mdash; Browser automation (most token-efficient)
- **GitHub** &mdash; PRs, issues, code search

Rule: Start with 3 MCPs. Add only for concrete needs.

---

## Structure

```text
pro-workflow/
├── skills/           # 17 skills
├── agents/           # 6 agents
├── commands/         # 16 slash commands
├── hooks/            # 18 events, 23 scripts
├── docs/             # 10 reference guides
├── rules/            # 7 rules (Cursor + universal)
├── contexts/         # 3 context modes
├── templates/        # Split CLAUDE.md + AGENTS.md
├── scripts/          # 23 hook scripts
├── src/              # TypeScript source (SQLite)
└── config.json
```

## Philosophy

1. **Compound improvements** &mdash; Small corrections lead to big gains over time
2. **Trust but verify** &mdash; Let AI work, review at checkpoints
3. **Zero dead time** &mdash; Parallel sessions keep momentum
4. **Memory is precious** &mdash; Both yours and Claude's
5. **Orchestrate, don't micromanage** &mdash; Wire patterns together, let agents execute

---

## Star History

<a href="https://star-history.com/#rohitg00/pro-workflow&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=rohitg00/pro-workflow&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=rohitg00/pro-workflow&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=rohitg00/pro-workflow&type=Date" />
 </picture>
</a>

---

<p align="center">
  <br/>
  <b>If pro-workflow saves you time, star the repo so others can find it.</b>
  <br/><br/>
  <a href="https://github.com/rohitg00/pro-workflow/stargazers"><img src="https://img.shields.io/github/stars/rohitg00/pro-workflow?style=for-the-badge&logo=github&color=D97757&labelColor=1e1e2e" alt="Stars"/></a>
  <br/><br/>
  <a href="https://rohitg00-pro-workflow.mintlify.app/">Documentation</a> &bull;
  <a href="https://agenstskills.com">SkillKit Marketplace</a> &bull;
  <a href="https://github.com/rohitg00/pro-workflow/issues">Report Issues</a> &bull;
  <a href="docs/">Reference Guides</a>
</p>
