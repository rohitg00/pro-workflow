[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/rohitg00-pro-workflow-badge.png)](https://mseep.ai/app/rohitg00-pro-workflow)

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
  <b>24 skills</b> &bull; <b>8 agents</b> &bull; <b>21 commands</b> &bull; <b>29 hook scripts across 24 events</b><br/>
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

---

## What's New in v3.2

- **LLM Gates** &mdash; First plugin with `type: "prompt"` hooks for AI-powered commit validation and secret detection
- **Permission Tuner** &mdash; Analyzes denial patterns, generates optimized allow/deny rules
- **Compact Guard** &mdash; Protects context through compaction (5-file restore limit, 50K budget)
- **Cost Tracker** &mdash; Session cost awareness with budget benchmarks
- **MCP Audit** &mdash; Analyzes MCP server token overhead per request
- **Auto Setup** &mdash; Detects project type, configures quality gates automatically
- **File Watcher** &mdash; Reactive workflows with `CLAUDE_ENV_FILE` injection
- **Agent Optimization** &mdash; `omitClaudeMd` on read-only agents saves tokens
- **6 New Hook Events** &mdash; PermissionDenied, Setup, WorktreeCreate, WorktreeRemove, CwdChanged, TaskCreated

---

## How Pro Workflow Compares

| Feature | Pro Workflow | [Superpowers](https://github.com/obra/superpowers) | [ECC](https://github.com/affaan-m/everything-claude-code) | [gstack](https://github.com/garrytan/gstack) | [GSD](https://github.com/gsd-build/get-shit-done) |
|---------|:-----------:|:-----------:|:---:|:------:|:---:|
| Self-correcting memory (SQLite + FTS5) | **Yes** | No | No | No | No |
| LLM-powered hooks (`type: "prompt"`) | **Yes** | No | No | No | No |
| Permission denial analysis | **Yes** | No | No | No | No |
| Compaction-aware state preservation | **Yes** | No | No | No | No |
| Cost tracking and budget alerts | **Yes** | No | No | No | No |
| MCP overhead auditing | **Yes** | No | No | No | No |
| Cross-agent (32+ agents via SkillKit) | **Yes** | No | Some | No | No |
| Skills | 24 | 14 | 140+ | 18+ | 0 |
| Agents | 8 | 5 | 36 | 0 | 18 |
| Commands | 21 | 3 | 60+ | 5+ | 57 |
| Hook Events | 24 | 8 | 18 | 0 | 0 |

---

## Try It

```bash
/develop add user authentication     # Multi-phase: Research > Plan > Implement > Review
/wrap-up                             # End session, capture learnings, audit changes
/doctor                              # Check your setup health
/learn-rule                          # Extract a correction into persistent memory
/commit                              # Quality gates > staged review > conventional commit
/permission-tuner                    # Analyze denials, generate allow/deny rules
/cost-tracker                        # Check session costs and token spend
/mcp-audit                           # Audit MCP servers for overhead
```

---

## What's Inside

### 24 Skills

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
| **LLM Gate** | AI-powered quality gates using `type: "prompt"` hooks |
| **Permission Tuner** | Analyze denial patterns, generate allow/deny rules |
| **Compact Guard** | State preservation through compaction cycles |
| **Cost Tracker** | Session cost awareness with budget benchmarks |
| **MCP Audit** | Audit MCP servers for token overhead and redundancy |
| **Auto Setup** | Detect project type, configure quality gates automatically |
| **File Watcher** | Reactive workflows on config and dependency changes |

### 8 Agents

| Agent | Purpose |
|-------|---------|
| **planner** | Break down complex tasks (read-only, approval-gated) |
| **reviewer** | Code review and security audit (checklist-based) |
| **scout** | Confidence-gated exploration (background, worktree-isolated) |
| **orchestrator** | Multi-phase feature development (Research > Plan > Implement > Review) |
| **debugger** | Systematic bug investigation (hypothesis-driven) |
| **context-engineer** | Context window analysis and optimization (lightweight, read-only) |
| **permission-analyst** | Analyze permission denial patterns, recommend rule optimizations |
| **cost-analyst** | Analyze token usage patterns, identify expensive operations |

### 21 Commands

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
| `/auto-setup` | Auto-detect project type and configure quality gates |
| `/compact-guard` | Protected compaction with state preservation |
| `/cost-tracker` | Track session costs and optimization tips |
| `/mcp-audit` | Audit MCP servers for token overhead |
| `/permission-tuner` | Analyze denial patterns, generate allow/deny rules |

### 29 Hook Scripts (24 Events)

| Hook Event | Scripts | What |
|------------|:-------:|------|
| SessionStart | 1 | Load learnings from database |
| SessionEnd | 1 | Save session stats to database |
| UserPromptSubmit | 2 | Correction tracking, drift detection |
| PreToolUse (Edit/Write) | 1 | Track edit count, quality gate reminders |
| PreToolUse (Bash) | 3 | Pre-commit check, LLM commit validation, pre-push check |
| PreToolUse (Write) | 1 | LLM-powered secret detection |
| PostToolUse (Edit) | 1 | Check for console.log, TODOs, secrets |
| PostToolUse (Bash) | 1 | Suggest learning from test failures |
| Stop | 2 | Context-aware reminders, auto-capture [LEARN] blocks |
| PreCompact | 1 | Save context state before compaction |
| PostCompact | 1 | Re-inject critical context summary |
| SubagentStart | 1 | Log subagent lifecycle for observability |
| SubagentStop | 1 | Log subagent completion and capture results |
| TaskCompleted | 1 | Quality gate on completion |
| TaskCreated | 1 | Validate task descriptions for tracking |
| PermissionRequest | 1 | Flag dangerous operations |
| PermissionDenied | 1 | Track denial patterns for optimization |
| PostToolUseFailure | 1 | Track failures, suggest learnings |
| TeammateIdle | 1 | Detect blockers in agent teams |
| StopFailure | 1 | Log errors with retry advice |
| FileChanged | 1 | Watch package.json, .env, CI configs |
| ConfigChange | 1 | Detect mid-session settings changes |
| Notification | 1 | Log permission requests |
| Setup | 1 | Auto-detect project type on init |
| WorktreeCreate | 1 | Log worktree creation for parallel tracking |
| WorktreeRemove | 1 | Cleanup worktree tracking on removal |
| CwdChanged | 1 | Detect project type on directory change |

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

Pro Workflow optimizes for the 80/20 ratio. Every correction becomes a rule. Every rule prevents future mistakes. The loop compounds.

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
| **LLM Gates** | AI-powered verification before destructive operations |
| **Permission Tuning** | Reduce prompt fatigue with denial pattern analysis |

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
├── skills/           # 24 skills
├── agents/           # 8 agents
├── commands/         # 21 slash commands
├── hooks/            # 24 events, 29 scripts
├── docs/             # 10 reference guides
├── rules/            # 7 rules (Cursor + universal)
├── contexts/         # 3 context modes
├── templates/        # Split CLAUDE.md + AGENTS.md
├── scripts/          # 29 hook scripts
├── src/              # TypeScript source (SQLite)
└── config.json
```

---

## Tips from the Community

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." &mdash; [Andrej Karpathy](https://x.com/karpathy/status/2015883857489522876)

> "Use subagents to throw more compute at a problem &mdash; offload tasks to keep your main context clean." &mdash; [Boris Cherny](https://x.com/bcherny/status/2017742755737555434)

> "If you do something more than once a day, turn it into a skill or command." &mdash; [Boris Cherny](https://x.com/bcherny/status/2017742748984742078)

> "Write detailed specs and reduce ambiguity before handing work off &mdash; the more specific you are, the better the output." &mdash; [Boris Cherny](https://x.com/bcherny/status/2017742752566632544)

> "Skill description field is a trigger, not a summary &mdash; write it for the model." &mdash; [Thariq Shihipar](https://x.com/trq212/status/2033949937936085378)

---

## Philosophy

1. **Compound improvements** &mdash; Small corrections lead to big gains over time
2. **Trust but verify** &mdash; Let AI work, review at checkpoints
3. **Zero dead time** &mdash; Parallel sessions keep momentum
4. **Memory is precious** &mdash; Both yours and Claude's
5. **Orchestrate, don't micromanage** &mdash; Wire patterns together, let agents execute

---

## Related Projects

| Project | Description |
|---------|-------------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 140+ skills, 36 agents &mdash; the comprehensive collection |
| [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | Curated tips, comparisons, and community best practices |
| [SkillKit](https://github.com/rohitg00/skillkit) | Universal CLI for managing skills across 32+ agents |
| [awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit) | 850+ files, 135 agents, 176 plugins &mdash; curated directory |

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
