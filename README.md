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
  Self-correcting memory + persistent FTS5-indexed wikis + auto-research loop, all on one SQLite store.<br/>
  Correct Claude once &mdash; it never repeats the mistake. Build a wiki on a topic &mdash; it grows itself overnight.<br/>
  <b>34 skills</b> &bull; <b>8 agents</b> &bull; <b>22 commands</b> &bull; <b>37 hook scripts across 24 events</b><br/>
  Works with <b>Claude Code</b>, <b>Cursor</b>, and <b>32+ agents</b> via SkillKit.
</p>

---

## The Problem

You correct Claude the same way 50 times. You explain conventions every new session. Context compacts, learnings vanish, mistakes repeat. You research the same topic in three different sessions because there is nowhere durable for the answers to land.

**Every Claude Code user hits this wall.**

## The Solution

Pro Workflow puts a single SQLite store underneath every session.

- **Self-correction memory** &mdash; every correction becomes a rule, FTS5-searchable, auto-loaded on session start.
- **Knowledge plane** &mdash; persistent research wikis on disk + FTS5 shadow index, queryable from any session, optionally grown by an auto-research loop.
- **Quality gates** &mdash; LLM-powered hooks, deterministic git/secret guards, compaction-aware state, cost tracking.

After 50 sessions you barely correct anything. After a week of auto-research, your wiki on a topic is denser than the curated lists you started from.

<p align="center">
  <img src="assets/self-correction-demo.svg" alt="Self-Correction Loop" width="700"/>
</p>

```
Session 1:  You → "Don't mock the database in tests"
            Claude → Proposes rule → You approve → Saved to SQLite

Session 2:  SessionStart loads all learnings + lists your wikis
            UserPromptSubmit auto-injects top wiki hits when relevant
            Claude writes integration tests, cites the right wiki page

Session 50: Correction rate near zero. Wiki has 200 cited claims.
```

---

## Install

Pro Workflow is published in two places: the Claude Code plugin marketplace (native), and SkillKit (cross-agent translator). Other agents do not have first-class plugins yet &mdash; SkillKit translates the skill bundle into each agent's native skill format.

### Claude Code (native)

```bash
/plugin marketplace add rohitg00/pro-workflow
/plugin install pro-workflow@pro-workflow
```

### Cursor, Codex, Copilot CLI, Droid, Gemini CLI, OpenCode, and 26 more (via SkillKit)

SkillKit translates the 34 skills + 22 commands into each agent's native skill format and drops them in the right config directory.

```bash
npx skillkit install rohitg00/pro-workflow --agent <name> --force
```

Notes:

- Use `rohitg00/pro-workflow` (the GitHub form), not the bare name &mdash; `skillkit install` resolves providers from `owner/repo`, not marketplace slugs.
- `--force` is currently required: SkillKit's security scanner has open false positives on standard Node patterns (`child_process` imports, `Bearer ${env}` template literals) that block legit skills like `survey-generator` and `safe-mode`. Tracked at [`skillkit#129`](https://github.com/rohitg00/skillkit/issues/129).

Supported `<name>` values: `cursor`, `codex`, `gemini-cli`, `opencode`, `github-copilot`, `droid` (factory), `antigravity`, `amp`, `clawdbot`, `cline`, `codebuddy`, `commandcode`, `continue`, `crush`, `goose`, `kilo`, `kiro-cli`, `mcpjam`, `mux`, `neovate`, `openhands`, `pi`, `qoder`, `qwen`, `roo`, `trae`, `universal`, `vercel`, `windsurf`, `zencoder`. Pass `--agent universal` for a portable bundle.

After install, run `skillkit sync` to register the skills with the target agent's config.

<details>
<summary>Manual install (any agent, any OS)</summary>

If neither path works for your setup, clone and copy the bundle directly. Adjust the destination to your agent's skill directory (e.g. `~/.cursor/rules/`, `~/.gemini/extensions/`, etc.).

```bash
git clone https://github.com/rohitg00/pro-workflow.git /tmp/pw
cd /tmp/pw && npm install && npm run build

cp -r /tmp/pw/templates/split-claude-md/* ./.claude/
cp -r /tmp/pw/skills    ~/.claude/skills/
cp -r /tmp/pw/commands  ~/.claude/commands/
cp    /tmp/pw/hooks/hooks.json ~/.claude/hooks.json
```

</details>

### First-run smoke test

```bash
/doctor              # confirms SQLite store, hooks, skills load
/wrap-up             # runs the end-of-session ritual (no-op on fresh install)
```

If `/doctor` reports `KB: missing`, run `cd ~/.claude/plugins/*/pro-workflow && npm install && npm run build` &mdash; the SQLite components need a build step a handful of marketplaces skip.

---

## What to type first

After install you have **34 auto-trigger skills** and **22 slash commands**. You don't need to memorize them; the agent picks the right skill from your prompt. The five commands below cover 80% of daily use:

| When | Command | What it does |
|---|---|---|
| **Wrong correction repeats** | `/learn-rule` | Capture the correction as a rule. Loaded on every future `SessionStart`. |
| **End of a coding session** | `/wrap-up` | Audit changes, persist learnings, write a handoff doc. |
| **Researching a topic** | `/wiki init <slug>` | Spin up a persistent FTS5 wiki. Auto-injected when you mention the topic later. |
| **Stuck on a hard bug** | `/develop` | Research &rarr; Plan &rarr; Implement phases with validation gates. |
| **Before a PR** | `/smart-commit` | Quality gates, staged review, conventional commit message. |

Full list: [`commands/`](./commands) &middot; [`skills/`](./skills) &middot; [`/list`](./commands/list.md) inside any session.

---

## 60-second tour

```bash
# 1. Self-correction (existing)
/learn-rule          # capture a correction
/wrap-up             # end session, persist learnings, audit changes
/insights            # heatmaps, trends, productivity

# 2. Knowledge plane (v3.3, new)
/wiki init agent-memory --title "Agent Memory" --flavor research
/wiki page agent-memory wiki/concepts/episodic-memory.md --type concept
/wiki ask "what is episodic memory" --wiki agent-memory

# 3. Auto-research (budget-capped, opt-in)
/wiki seed agent-memory "memory consolidation in agents"
/wiki research agent-memory --max-pages 5 --budget-usd 0.50

# 4. Hybrid retrieval (BM25 + vector RRF, optional)
/wiki embed agent-memory                       # OPENAI_API_KEY or VOYAGE_API_KEY
/wiki hybrid "consolidation patterns" --wiki agent-memory

# 5. Multi-LLM deliberation (transcript persists as a wiki page)
/wiki council "should we adopt episodic memory?" --wiki agent-memory

# 6. Browse the wiki visually (single-file HTML, S3-shareable)
/wiki view agent-memory
open ~/.pro-workflow/wikis/agent-memory/derived/viewer.html

# Kill switch for any auto loop
touch ~/.pro-workflow/STOP
```

`UserPromptSubmit` auto-loads top-3 wiki hits when prompts mention indexed topics. `SessionStart` lists registered wikis and recent learnings.

---

## What's new in v3.3

Persistent knowledge plane on top of self-correction memory.

| Skill | Purpose |
|-------|---------|
| **wiki-builder** | Persistent FTS5-indexed research wikis. 9 flavors: research, paper, domain, product, person, organization, project, codebase, incident. Path-traversal-guarded. |
| **wiki-query** | BM25 retrieval with snippets. `ask`, `related`, `show`. Auto-injects on `UserPromptSubmit`. |
| **wiki-research-loop** | Budget-capped BFS. Pluggable source fetchers (web/arXiv/GitHub + custom). Convergence detection, kill-switch, atomic seed claim, try/finally state guards. |
| **llm-council** | Provider-agnostic 3-phase deliberation (Anthropic/OpenAI/OpenRouter/Fireworks/custom). `Promise.allSettled` so one provider failure doesn't abort the run. Transcript persists as a wiki page. |
| **survey-generator** | Provider-agnostic literature survey. Output target = wiki markdown page. Bibliography validation (uniqueness + section-paper refs), citation IDs aligned with `sources.md` rows. |
| **wiki-viewer** | Single-file HTML viewer for any wiki: pages + sources + seeds + link graph + in-browser search + "copy as seed" CTAs. S3-shareable. Applied lessons from [Thariq Shihipar's HTML-as-output thesis](https://x.com/trq212/status/2034017024445244382). |

Plus: `/wiki` command (now with `view`), `learn-rule` `Wiki: <slug>` scoping, schema additions (`wikis`, `wiki_pages` + FTS5, `wiki_sources`, `wiki_claims`, `wiki_seeds`, `wiki_embeddings`, `learnings_wiki`), reactive file-watcher seed enqueue, cron-tick driver, `/doctor` extended with KB + provider sections.

---

## Comparison

| Feature | Pro Workflow | [Superpowers](https://github.com/obra/superpowers) | [ECC](https://github.com/affaan-m/everything-claude-code) | [gstack](https://github.com/garrytan/gstack) | [GSD](https://github.com/gsd-build/get-shit-done) |
|---------|:-----------:|:-----------:|:---:|:------:|:---:|
| Self-correcting memory (SQLite + FTS5) | **Yes** | No | No | No | No |
| Persistent research wikis (FTS5) | **Yes** | No | No | No | No |
| Auto-research loop (budget-capped BFS) | **Yes** | No | No | No | No |
| Hybrid retrieval (BM25 + vector + RRF) | **Yes** | No | No | No | No |
| Multi-provider LLM council | **Yes** | No | No | No | No |
| LLM-powered hooks (`type: "prompt"`) | **Yes** | No | No | No | No |
| Permission denial analysis | **Yes** | No | No | No | No |
| Compaction-aware state preservation | **Yes** | No | No | No | No |
| Cost tracking and budget alerts | **Yes** | No | No | No | No |
| MCP overhead auditing | **Yes** | No | No | No | No |
| Cross-agent (32+ agents via SkillKit) | **Yes** | No | Some | No | No |
| Skills | 34 | 14 | 140+ | 18+ | 0 |
| Agents | 8 | 5 | 36 | 0 | 18 |
| Commands | 22 | 3 | 60+ | 5+ | 57 |
| Hook events | 24 | 8 | 18 | 0 | 0 |

---

## What's inside

### 34 skills

**Knowledge plane (new in v3.3)**

| Skill | What it does |
|-------|--------------|
| **wiki-builder** | Scaffold + register FTS5-indexed research wikis |
| **wiki-query** | BM25 retrieval, snippets, related, show |
| **wiki-research-loop** | Budget-capped BFS over web/arXiv/GitHub fetchers |
| **llm-council** | Provider-agnostic 3-phase multi-LLM deliberation |
| **survey-generator** | Literature survey artifact, output to a wiki page |
| **wiki-viewer** | Single-file HTML viewer (pages, sources, seeds, link graph, search) |

**Quality gates and observability**

| Skill | What it does |
|-------|--------------|
| **smart-commit** | Quality gates, staged review, conventional commits |
| **llm-gate** | AI-powered commit and secret hooks (`type: "prompt"`) |
| **permission-tuner** | Analyze denials, generate allow/deny rules |
| **compact-guard** | State preservation through compaction cycles |
| **cost-tracker** | Session cost awareness with budget benchmarks |
| **mcp-audit** | MCP server token-overhead analysis |
| **token-efficiency** | Anti-sycophancy + tool-call budgets + read-before-write |
| **safe-mode** | Guardrails for destructive operations |
| **insights** | Session analytics, correction trends, productivity |
| **thoroughness-scoring** | Rate completeness of implementations |
| **deslop** | Remove AI-generated code slop from a diff |

**Memory and learning**

| Skill | What it does |
|-------|--------------|
| **pro-workflow** | Core 8 patterns |
| **learn-rule** | Capture corrections (now wiki-scopeable) |
| **replay-learnings** | Surface past learnings for the current task |
| **wrap-up** | End-of-session ritual |
| **session-handoff** | Resume documents for the next session |

**Orchestration and engineering loop**

| Skill | What it does |
|-------|--------------|
| **orchestrate** | Multi-phase Research → Plan → Implement → Review |
| **agent-teams** | Multi-instance coordination, shared task list |
| **batch-orchestration** | Parallel worktree agents for large changes |
| **parallel-worktrees** | Git worktree setup for zero dead time |
| **context-engineering** | Write/Select/Compress/Isolate framework |
| **context-optimizer** | Token management, context budget, MCP audit |
| **auto-setup** | Auto-detect project type, configure quality gates |
| **file-watcher** | Reactive workflows on config and dependency changes |
| **bug-capture** | Capture defects as durable issues without leaking paths |
| **module-map** | One-screen map of an unfamiliar codebase area |
| **plan-interrogate** | Stress-test a plan by walking its decision tree |
| **sprint-status** | Track multi-session progress |

### 8 agents

| Agent | Purpose |
|-------|---------|
| **planner** | Break down complex tasks (read-only, approval-gated) |
| **reviewer** | Code review and security audit (checklist-based) |
| **scout** | Confidence-gated exploration (background, worktree-isolated) |
| **orchestrator** | Multi-phase feature development |
| **debugger** | Systematic, hypothesis-driven bug investigation |
| **context-engineer** | Context-window analysis (lightweight, read-only) |
| **permission-analyst** | Denial-pattern analysis, rule-optimization recommendations |
| **cost-analyst** | Token-usage analysis, identify expensive operations |

### 22 commands

| Command | What it does |
|---------|--------------|
| `/wiki` | Knowledge-plane entry: init, page, ask, hybrid, seed, research, council, survey, embed, status |
| `/develop` | Multi-phase feature build with validation gates |
| `/commit` | Smart commit with quality gates |
| `/wrap-up` | End-of-session checklist and learning capture |
| `/learn-rule` / `/learn` | Extract correction or learn Claude Code best practices |
| `/doctor` | Setup health check (now includes wiki KB + council providers) |
| `/insights` | Session analytics and correction heatmap |
| `/replay` | Surface past learnings for the current task |
| `/handoff` | Session handoff document |
| `/search` / `/list` | Search and list stored learnings |
| `/deslop` | Remove AI-generated code slop |
| `/context-optimizer` | Audit and optimize context-window usage |
| `/parallel` | Set up git worktrees for parallel sessions |
| `/safe-mode` | Toggle destructive-operation guardrails |
| `/sprint-status` | Track multi-session progress |
| `/auto-setup` | Auto-detect project type, configure quality gates |
| `/compact-guard` | Protected compaction with state preservation |
| `/cost-tracker` | Track session costs and optimization tips |
| `/mcp-audit` | Audit MCP servers for token overhead |
| `/permission-tuner` | Generate allow/deny rules from denial patterns |

### 37 hook scripts across 24 events

`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `PermissionRequest`, `PermissionDenied`, `PostToolUseFailure`, `TeammateIdle`, `StopFailure`, `FileChanged`, `ConfigChange`, `Notification`, `Setup`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`.

Selected high-leverage hooks:

| Hook | Script | Effect |
|------|--------|--------|
| `SessionStart` | `session-start.js` | Loads learnings; lists registered wikis |
| `UserPromptSubmit` | `prompt-submit.js` | Auto-injects top-3 wiki hits when prompts match the index |
| `Stop` | `learn-capture.js` | Auto-captures `[LEARN]` blocks (now parses `Wiki: <slug>`) |
| `FileChanged` | `file-changed.js` | Edits inside a wiki tree enqueue verify-seeds |
| `PreToolUse(Bash)` | `commit-validate.js`, `git-blast-radius.js`, `pre-push-check.js` | Conventional commit + destructive op + push guardrails |
| `PreToolUse(Write)` | `secret-scan.js` | LLM-powered secret detection |
| `PreCompact` / `PostCompact` | `pre-compact.js`, `post-compact.js` | Save and re-inject critical context summary |

### 9 reference guides

| Guide | What's covered |
|-------|----------------|
| [`settings-guide.md`](docs/settings-guide.md) | Settings keys, permission modes, hierarchy |
| [`cli-cheatsheet.md`](docs/cli-cheatsheet.md) | CLI flags, keyboard shortcuts, slash commands |
| [`orchestration-patterns.md`](docs/orchestration-patterns.md) | Command → Agent → Skill architecture, agent teams |
| [`context-engineering.md`](docs/context-engineering.md) | Write/Select/Compress/Isolate, memory taxonomy, compaction |
| [`agent-teams.md`](docs/agent-teams.md) | Setup, decomposition, teams vs sub-agents |
| [`context-loading.md`](docs/context-loading.md) | CLAUDE.md loading, agent memory, skills discovery |
| [`cross-agent-workflows.md`](docs/cross-agent-workflows.md) | Claude Code + Cursor together, SkillKit translation |
| [`decision-framework.md`](docs/decision-framework.md) | When to use which pattern |
| [`daily-habits.md`](docs/daily-habits.md) | Session habits, debugging tips, anti-patterns |

---

## How it works

### `/develop` flow

<p align="center">
  <img src="assets/workflow-flow.svg" alt="Development Flow" width="900"/>
</p>

Research before planning. Plan before implementing. Review before committing. Validation gates between every phase.

### Architecture

<p align="center">
  <img src="assets/architecture.svg" alt="Architecture Diagram" width="900"/>
</p>

Command → Agent → Skill, layered over a single SQLite store. The knowledge plane (v3.3) plugs into the same store as the learning rules.

### Storage

```
~/.pro-workflow/
├── data.db                 # learnings, sessions, wikis (registry), wiki_pages (+FTS5),
│                           # wiki_sources, wiki_claims, wiki_seeds, wiki_embeddings,
│                           # learnings_wiki
├── wikis/<slug>/           # global-scope wikis (default location)
├── council/<session-id>/   # llm-council transcripts
├── fetchers/               # user-supplied custom source fetchers
├── tick.log                # cron-driven research-tick log
└── STOP                    # touch this file to halt every research loop
```

Project-scope wikis live at `<project>/.claude/wikis/<slug>/` and are committable.

---

## Patterns

| Pattern | What it does |
|---------|--------------|
| **Self-Correction Loop** | Claude learns from corrections automatically |
| **Knowledge Plane** | Wiki + auto-research loop on the same SQLite store |
| **Multi-Phase Dev** | Research → Plan → Implement → Review with gates |
| **Parallel Worktrees** | Zero dead time with native `claude -w` |
| **Wrap-Up Ritual** | End sessions with intention, capture learnings |
| **Split Memory** | Modular CLAUDE.md for complex projects |
| **80/20 Review** | Batch reviews at checkpoints |
| **Context Engineering** | Write/Select/Compress/Isolate for token management |
| **Agent Teams** | Multi-instance coordination with shared task list |
| **Batch Orchestration** | Parallel worktree agents for large-scale changes |
| **LLM Gates** | AI-powered verification before destructive operations |
| **Permission Tuning** | Denial-pattern analysis to reduce prompt fatigue |
| **Token Efficiency** | Anti-sycophancy + tool-call budgets + read-before-write |
| **Multi-LLM Council** | Provider-agnostic 3-phase deliberation for high-stakes calls |

---

## Cross-agent support

Works across 32+ AI coding agents via [SkillKit](https://agenstskills.com):

```bash
npx skillkit install pro-workflow
npx skillkit translate pro-workflow --agent cursor
npx skillkit translate pro-workflow --agent codex
npx skillkit translate pro-workflow --agent gemini-cli
```

Supported: Claude Code, Cursor, Codex CLI, Gemini CLI, Windsurf, OpenCode, Kiro, Amp, Goose, Roo, and 27 more.

---

## Configuration

### Settings

See [`settings.example.json`](settings.example.json) for production-ready configuration: permission rules, output style, auto-compaction, custom spinner verbs.

### MCP

See [`mcp-config.example.json`](mcp-config.example.json):

- **context7** &mdash; live documentation lookup
- **playwright** &mdash; browser automation (most token-efficient)
- **GitHub** &mdash; PRs, issues, code search

Rule: start with three MCPs, add only for concrete needs.

### Knowledge plane env

| Env | When |
|-----|------|
| `WIKI_ROOT` | Override default `~/.pro-workflow/wikis` |
| `OPENAI_API_KEY` / `VOYAGE_API_KEY` | Enable hybrid retrieval (embeddings) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `FIREWORKS_API_KEY` / `LLM_COUNCIL_BASE_URL`+`LLM_COUNCIL_API_KEY` | Pick a council provider (first match wins) |
| `WIKI_LOOP_BUDGET_USD` / `WIKI_LOOP_MAX_PAGES` / `WIKI_LOOP_MAX_DEPTH` | Per-run loop overrides |
| `GH_TOKEN` / `GITHUB_TOKEN` | Lifts GitHub-fetcher rate limit |

---

## Structure

```text
pro-workflow/
├── skills/           # 34 skills
├── agents/           # 8 agents
├── commands/         # 22 slash commands
├── scripts/          # 37 hook scripts (24 events)
├── docs/             # 9 reference guides + index.html + infographic.html
├── rules/            # rule packs (Cursor + universal)
├── contexts/         # context modes
├── templates/        # split CLAUDE.md + AGENTS.md
├── src/              # TypeScript source (SQLite + embeddings)
└── config.json
```

---

## Tips from the community

> "80% of my code is written by AI, 20% is spent reviewing and correcting it." &mdash; [Andrej Karpathy](https://x.com/karpathy/status/2015883857489522876)

> "Use subagents to throw more compute at a problem &mdash; offload tasks to keep your main context clean." &mdash; [Boris Cherny](https://x.com/bcherny/status/2017742755737555434)

> "If you do something more than once a day, turn it into a skill or command." &mdash; [Boris Cherny](https://x.com/bcherny/status/2017742748984742078)

> "Write detailed specs and reduce ambiguity before handing work off." &mdash; [Boris Cherny](https://x.com/bcherny/status/2017742752566632544)

> "Skill description field is a trigger, not a summary &mdash; write it for the model." &mdash; [Thariq Shihipar](https://x.com/trq212/status/2033949937936085378)

---

## Philosophy

1. **Compound improvements** &mdash; small corrections lead to big gains.
2. **Trust but verify** &mdash; let AI work, review at checkpoints.
3. **Zero dead time** &mdash; parallel sessions keep momentum.
4. **Memory is precious** &mdash; both yours and Claude's.
5. **Persistent over ephemeral** &mdash; if you'll need it next session, write it down on disk.
6. **Orchestrate, don't micromanage** &mdash; wire patterns together, let agents execute.

---

## Related projects

| Project | Description |
|---------|-------------|
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 140+ skills, 36 agents — the comprehensive collection |
| [claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | Curated tips, comparisons, community best practices |
| [SkillKit](https://github.com/rohitg00/skillkit) | Universal CLI for managing skills across 32+ agents |
| [awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit) | 850+ files, 135 agents, 176 plugins — curated directory |

---

## Star history

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
