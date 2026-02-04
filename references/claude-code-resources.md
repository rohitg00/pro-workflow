# Claude Code Best Practices

Essential patterns for mastering Claude Code. Internalized from production use, referencing official documentation at https://code.claude.com/docs/ for deep dives.

## Official Documentation

**Source:** https://code.claude.com/docs/

| Topic | URL | When to Reference |
|-------|-----|-------------------|
| Quickstart | https://code.claude.com/docs/quickstart | First-time setup, onboarding |
| Common Workflows | https://code.claude.com/docs/common-workflows | Day-to-day patterns |
| CLI Reference | https://code.claude.com/docs/cli-reference | Commands, flags, shortcuts |
| Settings | https://code.claude.com/docs/settings | CLAUDE.md, config, preferences |
| Sub-agents | https://code.claude.com/docs/sub-agents | Task delegation, parallel work |
| MCP | https://code.claude.com/docs/mcp | External tool integration |
| Hooks | https://code.claude.com/docs/hooks | Automation, quality gates |
| Security | https://code.claude.com/docs/security | Permissions, sandboxing |
| Troubleshooting | https://code.claude.com/docs/troubleshooting | Common issues |
| GitHub Actions | https://code.claude.com/docs/github-actions | CI/CD automation |
| IDE Integration | https://code.claude.com/docs/ide-integration | VS Code, JetBrains |

## Sessions & Context

Every Claude Code invocation is a session. Claude reads your project structure on start.

**Key practices:**
- Context window is finite (200k tokens). Use `/context` to check usage.
- Use `/compact` at task boundaries — after planning, after completing a feature, when context >70%.
- Don't compact mid-task. You lose important working context.
- Summarize exploration results before moving to implementation.

**Pro-Workflow pattern:** Context Discipline (Pattern 7)
**Docs:** https://code.claude.com/docs/common-workflows

## CLAUDE.md & Memory

CLAUDE.md is persistent project memory that loads every session. It's the most important file for productivity.

**What to put in CLAUDE.md:**
- Project structure and architecture overview
- Build/test/lint commands
- Code conventions and style rules
- Common gotchas specific to your project
- Constraints Claude should respect

**What NOT to put:**
- Entire file contents (wastes context)
- Obvious things any developer would know
- Rapidly changing information

**Pro-Workflow pattern:** Split Memory (Pattern 4), Self-Correction Loop (Pattern 1)
**Docs:** https://code.claude.com/docs/settings

## Modes

Three modes for different work styles:

| Mode | When | Behavior |
|------|------|----------|
| **Normal** | Default | Claude asks before edits |
| **Auto-Accept** | Trusted iteration | Claude edits without asking |
| **Plan** | Complex tasks | Research first, then propose plan |

**When to use Plan mode:**
- Task touches >3 files
- Architecture decisions needed
- Multiple valid approaches exist
- Requirements are unclear

**Toggle:** `Shift+Tab` cycles through modes.

**Pro-Workflow pattern:** 80/20 Review (Pattern 5)
**Docs:** https://code.claude.com/docs/common-workflows

## CLI Navigation

Essential shortcuts for speed:

| Shortcut | Action |
|----------|--------|
| `Shift+Tab` | Cycle modes (Normal → Auto → Plan) |
| `Ctrl+L` | Clear screen |
| `Ctrl+C` | Cancel current generation |
| `Ctrl+B` | Run current task in background |
| `Up/Down` | Navigate prompt history |
| `/compact` | Compact context |
| `/context` | Check context usage |
| `/clear` | Clear conversation |

**Pro-Workflow pattern:** Context Discipline (Pattern 7)
**Docs:** https://code.claude.com/docs/cli-reference

## Prompting

Good prompts have four parts:

1. **Scope** — What files/area to work in
2. **Context** — Background info Claude needs
3. **Constraints** — What NOT to do, limits
4. **Acceptance criteria** — How to know it's done

**Example of a good prompt:**
```
In src/auth/, add rate limiting to the login endpoint.
We use Express with Redis for sessions.
Don't change the session middleware.
It should return 429 after 5 failed attempts per IP in 15 minutes.
```

**Example of a bad prompt:**
```
Add rate limiting
```

**Pro-Workflow pattern:** 80/20 Review (Pattern 5)

## Writing Rules & Constraints

Rules in CLAUDE.md prevent Claude from going off-track. Be specific.

**Good rules:**
```
- Always use snake_case for database columns
- Never modify files in vendor/
- Run `pytest -x` after any Python file change
- Use TypeScript strict mode, no `any` types
```

**Bad rules:**
```
- Write good code
- Follow best practices
- Be careful
```

**Pro-Workflow pattern:** Self-Correction Loop (Pattern 1)

## Skills & Automation

Skills are reusable Claude Code commands defined in markdown with frontmatter.

**When to create a skill:**
- You repeat the same prompt pattern >3 times
- A workflow has a consistent structure
- You want to share a pattern with your team

**Skill structure:**
```markdown
---
name: my-skill
description: What this skill does
tools: Read, Grep, Edit
---

Instructions for Claude when this skill is invoked.
```

**Pro-Workflow pattern:** Learning Log (Pattern 8)
**Docs:** https://code.claude.com/docs/settings

## Subagents & Parallelism

Subagents run in separate context windows. Use them for parallel work.

**When to use subagents:**
- Parallel file exploration
- Background long-running operations
- Independent research tasks

**When NOT to use subagents:**
- Simple single-file reads
- Tasks needing conversation context
- Sequential dependent operations

**Background execution:** Press `Ctrl+B` to send a task to background while you continue working.

**Pro-Workflow pattern:** Parallel Worktrees (Pattern 2)
**Docs:** https://code.claude.com/docs/sub-agents

## Hooks

Hooks automate quality enforcement. They run scripts on specific events.

**Hook types:**
- `PreToolUse` — Before edits, commits, pushes
- `PostToolUse` — After edits, test runs
- `SessionStart` — Load patterns, check state
- `SessionEnd` — Capture learnings, check uncommitted
- `Stop` — After each response
- `UserPromptSubmit` — Before processing user input

**Pro-Workflow pattern:** All hooks in `hooks/hooks.json`
**Docs:** https://code.claude.com/docs/hooks

## Security & Permissions

Claude Code has a permission model. Understand it before handling sensitive data.

**Key principles:**
- Review permission requests carefully
- Don't auto-approve shell commands you don't understand
- Keep secrets out of CLAUDE.md
- Use `.gitignore` and `.claudeignore` for sensitive files

**Docs:** https://code.claude.com/docs/security

## MCP (Model Context Protocol)

MCP connects Claude to external tools and data sources.

**Guidelines:**
- Keep <10 MCPs enabled
- Keep total tools <80
- Disable MCPs you're not actively using
- Each MCP adds context overhead

**Docs:** https://code.claude.com/docs/mcp

## Integration

| Platform | Docs |
|----------|------|
| VS Code | https://code.claude.com/docs/ide-integration |
| JetBrains | https://code.claude.com/docs/ide-integration |
| GitHub Actions | https://code.claude.com/docs/github-actions |

## How to Use These Practices

### With /learn-rule
When you discover a Claude Code best practice:
```
[LEARN] Claude-Code: <the practice>
```

### With /learn
Save to database with `Claude-Code` category for searchability.

### Learning Path
1. **Start** — Read the quickstart, learn CLI shortcuts, understand context limits
2. **Build** — Write a good CLAUDE.md, learn modes, improve your prompts
3. **Scale** — Create skills, use subagents, set up hooks
4. **Optimize** — Layer Pro-Workflow patterns 1-8 for production use
5. **Reference** — Official docs for deep dives on any topic
