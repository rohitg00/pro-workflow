# /learn - Claude Code Best Practices & Learning Capture

Learn Claude Code best practices and capture lessons into persistent memory.

## Usage

- `/learn` — Show best practices guide
- `/learn <topic>` — Show practices for a specific topic (e.g., `/learn context`, `/learn prompting`)
- `/learn save` — Capture a lesson from this session into the database

## Best Practices

### Sessions & Context
- Every Claude Code invocation is a session. Claude reads your project on start.
- Context window is finite (200k tokens). Use `/context` to check usage.
- Use `/compact` at task boundaries — after planning, after a feature, when >70%.
- Don't compact mid-task. You lose working context.
- Plan mode now survives compaction (fixed in 2.1.49).
- **Docs:** https://code.claude.com/docs/common-workflows
- **Pattern:** Context Discipline (Pattern 7)

### CLAUDE.md & Memory
- CLAUDE.md is persistent project memory. It loads every session.
- Put: project structure, build commands, conventions, constraints, gotchas.
- Don't put: entire file contents, obvious things, rapidly changing info.
- For complex projects, split into AGENTS.md, SOUL.md, LEARNED.md.
- **Docs:** https://code.claude.com/docs/settings
- **Pattern:** Split Memory (Pattern 4)

### Modes
- **Normal** — Claude asks before edits (default)
- **Auto-Accept** — Claude edits without asking (trusted iteration)
- **Plan** — Research first, then propose plan (complex tasks)
- **Simple** — Bash + Edit tools only (lightweight, no extra overhead)
- Use Plan mode when: >3 files, architecture decisions, multiple approaches, unclear requirements.
- Toggle with `Shift+Tab`.
- **Docs:** https://code.claude.com/docs/common-workflows
- **Pattern:** 80/20 Review (Pattern 5)

### CLI Shortcuts
| Shortcut | Action |
|----------|--------|
| `Shift+Tab` | Cycle modes (Normal/Auto-Accept/Plan) |
| `Ctrl+L` | Clear screen |
| `Ctrl+C` | Cancel generation |
| `Ctrl+B` | Run task in background |
| `Ctrl+F` | Kill all background agents (two-press confirmation) |
| `Ctrl+T` | Toggle task list (agent teams) |
| `Shift+Down` | Navigate teammates (wraps around) |
| `Up/Down` | Prompt history |
| `/compact` | Compact context |
| `/context` | Check context usage |
| `/clear` | Clear conversation |
| `/agents` | Manage subagents |
| `/model` | Switch models |
| `/commit` | Smart commit with quality gates |
| `/insights` | Session analytics and patterns |
- **Docs:** https://code.claude.com/docs/cli-reference

### Worktrees
Native worktree support (2.1.49+):
```bash
claude --worktree    # or claude -w
```
Creates an isolated git worktree automatically. Subagents support `isolation: worktree` in frontmatter.

### Prompting
Good prompts have four parts:
1. **Scope** — What files/area to work in
2. **Context** — Background info Claude needs
3. **Constraints** — What NOT to do
4. **Acceptance criteria** — How to know it's done

Bad: "Add rate limiting"
Good: "In src/auth/, add rate limiting to the login endpoint. We use Express with Redis. Don't change session middleware. Return 429 after 5 failed attempts per IP in 15 min."

### Writing Rules
Rules in CLAUDE.md prevent Claude from going off-track.
- Good: "Always use snake_case for database columns"
- Good: "Run pytest -x after any Python file change"
- Bad: "Write good code"
- Bad: "Be careful"
- **Pattern:** Self-Correction Loop (Pattern 1)

### Skills
Skills are reusable commands defined in markdown with frontmatter. Create one when you repeat the same prompt pattern >3 times.
- **Docs:** https://code.claude.com/docs/settings
- **Pattern:** Learning Log (Pattern 8)

### Subagents
Subagents run in separate context windows for parallel work.
- Use for: parallel exploration, background tasks, independent research.
- Avoid for: single-file reads, tasks needing conversation context.
- Press `Ctrl+B` to send tasks to background.
- Press `Ctrl+F` to kill all background agents (two-press confirmation).
- ESC cancels the main thread only; background agents keep running.
- Create custom subagents in `.claude/agents/` (project) or `~/.claude/agents/` (user).
- Subagents support: custom tools, permission modes, persistent memory, hooks, skill preloading, and **worktree isolation**.
- Agent definitions support `background: true` to always run as background tasks.
- Built-in subagents: Explore (fast read-only), Plan (research), general-purpose (multi-step).
- Use `/agents` to manage subagents interactively.
- **Docs:** https://code.claude.com/docs/sub-agents
- **Pattern:** Parallel Worktrees (Pattern 2)

### Agent Teams (Experimental)
Coordinate multiple Claude Code instances working together as a team.
- Enable: set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json or environment.
- One lead session coordinates, teammates work independently with their own context windows.
- Teammates can message each other directly (unlike subagents which only report back).
- Shared task list with self-coordination and dependency management.
- Display modes: in-process (`Shift+Down` to navigate, wraps around) or split panes (tmux/iTerm2).
- Delegate mode (`Shift+Tab`): restricts lead to coordination only.
- Best for: parallel code review, competing hypotheses debugging, cross-layer changes, research.
- Avoid for: sequential tasks, same-file edits, simple operations.
- **Docs:** https://code.claude.com/docs/agent-teams

### Adaptive Thinking
Claude calibrates reasoning depth to each task automatically.
- Lightweight tasks get quick responses, complex tasks get deep analysis.
- No configuration needed - works out of the box with Opus 4.6.
- Extended thinking is built-in — no need to toggle a separate mode.

### Model Selection
- **Sonnet 4.5 with 1M context has been retired** — switch to Sonnet 4.6 (now has 1M context) via `/model`.
- Opus 4.6 has adaptive thinking built-in.
- Use Haiku 4.5 for quick, read-only exploration subagents.

### Context Compaction
Keeps long-running agents from hitting context limits.
- Auto-compacts at ~95% capacity (configurable via `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`).
- Compact manually at task boundaries with `/compact`.
- Custom subagents support auto-compaction independently.
- Use PreCompact hooks to save state before compaction.
- Plan mode now survives compaction (2.1.49 fix).

### Hooks
Hooks run scripts on events to automate quality enforcement.
- Types: PreToolUse, PostToolUse, SessionStart, SessionEnd, Stop, UserPromptSubmit, PreCompact, SubagentStart, SubagentStop, **ConfigChange**, Notification
- **ConfigChange** (2.1.49+): fires when settings files change mid-session — useful for security auditing.
- **Stop hook** now receives `last_assistant_message` for context-aware reminders.
- Pro-Workflow ships hooks for edit tracking, quality gates, config monitoring, and learning capture.
- Subagent hooks: define in frontmatter or settings.json for lifecycle events.
- **Docs:** https://code.claude.com/docs/hooks

### Plugins
- Plugins can ship `settings.json` for default permission configuration (2.1.49+).
- Pro-Workflow ships default permissions for quality gate commands (lint, test, typecheck).
- **Docs:** https://code.claude.com/docs/plugins

### Security
- Review permission requests carefully.
- Don't auto-approve shell commands you don't understand.
- Keep secrets out of CLAUDE.md.
- Use `.gitignore` and `.claudeignore` for sensitive files.
- **Docs:** https://code.claude.com/docs/security

### MCP
- Keep <10 MCPs enabled, <80 tools total.
- Disable MCPs you're not actively using.
- Each MCP adds context overhead.
- MCP auth failures are now cached to avoid repeated connection attempts.
- **Docs:** https://code.claude.com/docs/mcp

### Integration
- **VS Code / JetBrains:** https://code.claude.com/docs/ide-integration
- **GitHub Actions:** https://code.claude.com/docs/github-actions
- **Troubleshooting:** https://code.claude.com/docs/troubleshooting

## Learning Path

**Beginner:** Sessions, CLI shortcuts, context management, modes
**Intermediate:** CLAUDE.md, writing rules, prompting, skills
**Advanced:** Subagents, hooks, MCP, GitHub Actions, Pro-Workflow patterns 1-8

## Saving Learnings

When the user runs `/learn save`, capture a lesson from this session.

### Step 1: Identify the learning

Ask the user what they learned, or extract it from the conversation. Format it as:

```
Category: <category>
Rule: <one-line description of the correct behavior>
Mistake: <what went wrong>
Correction: <how it was fixed>
```

### Categories
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

### Step 2: Save to database

After the user confirms the learning, write it to the database:

```bash
sqlite3 ~/.pro-workflow/data.db "INSERT INTO learnings (project, category, rule, mistake, correction) VALUES ('<project>', '<category>', '<rule>', '<mistake>', '<correction>');"
```

Replace `<project>` with the current project name (from `basename $PWD`), or `NULL` if unknown. Escape single quotes in values by doubling them (`''`).

Alternatively, use the store API:

```bash
node -e "const p = require('path'); const {createStore} = require(p.join(process.env.HOME, '.claude/plugins/marketplaces/pro-workflow/dist/db/store.js')); const s = createStore(); const l = s.addLearning({project: '<project>', category: '<category>', rule: '<rule>', mistake: '<mistake>', correction: '<correction>'}); console.log('Saved as learning #' + l.id); s.close();"
```

### Step 3: Confirm to user

After saving, output a confirmation with the learning ID:

```
Saved as learning #<id>. Use /search <keyword> to find this later.
```

### Auto-capture via [LEARN] tags

You can also emit `[LEARN]` blocks in your response, which the Stop hook will auto-capture:

```
[LEARN] Category: Rule text here
Mistake: What went wrong
Correction: How it was fixed
```

### Example

```
Category: Claude-Code
Rule: Use plan mode before multi-file changes
Mistake: Started editing 5 files without a plan, had to redo
Correction: Enter plan mode first, get approval, then execute
```

After user confirms → run the sqlite3 INSERT → output:

```
Saved as learning #42. Use /search plan to find this later.
```

Learnings are stored in `~/.pro-workflow/data.db` and persist across sessions.

Use `/search <keyword>` to find past learnings.
Use `/list` to see all learnings.

---

**Trigger:** Use when user says "learn", "teach me", "best practices", "remember this", or after making a mistake.
