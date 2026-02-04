---
name: pro-workflow
description: Battle-tested Claude Code workflows from power users. Self-correcting memory, parallel worktrees, wrap-up rituals, and the 80/20 AI coding ratio. Distilled from real production use.
tools: Read, Glob, Grep, Bash, Edit, Write
---

# Pro Workflow

Real-world Claude Code patterns from power users who ship production code daily. Not theory - workflows that compound over time.

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

```
User: You edited the wrong file
Claude: I edited src/utils.ts when you meant src/lib/utils.ts.

[LEARN] Navigation: Confirm full path before editing files with common names.

Should I add this?
```

---

## 2. Parallel Sessions with Worktrees

**Zero dead time.** While one Claude thinks, work on something else.

### Setup

```bash
# Create worktrees for parallel work
git worktree add ../project-feat feature-branch
git worktree add ../project-fix bugfix-branch

# Each gets its own Claude session
# Terminal 1: cd ~/project && claude
# Terminal 2: cd ~/project-feat && claude
```

### When to Parallelize

| Scenario | Action |
|----------|--------|
| Waiting on tests | Start new feature in worktree |
| Long build | Debug issue in parallel |
| Exploring approaches | Try 2-3 simultaneously |

### Add to CLAUDE.md

```markdown
## Parallel Work
When blocked on long operations, suggest starting a parallel session in a worktree.
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

```
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

**Opus 4.5 + Thinking is often one-shot** - saves correction cycles.

| Task | Model |
|------|-------|
| Quick fixes | Haiku |
| Features | Sonnet |
| Refactors | Opus |
| Architecture | Opus 4.5 + Thinking |
| Hard bugs | Opus 4.5 + Thinking |

### Add to CLAUDE.md

```markdown
## Model Hints
Escalate to Opus+Thinking when: first attempt failed, multi-system coordination, non-obvious bugs.
```

---

## 7. Context Discipline

200k tokens is precious. Manage it.

### Rules

1. Read before edit
2. Compact at task boundaries
3. Disable unused MCPs (<10 enabled, <80 tools)
4. Summarize explorations

### Good Compact Points

- After planning, before execution
- After completing a feature
- When context >70%

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

**Master Claude Code through built-in best practices and official documentation.**

Pro-workflow teaches Claude Code concepts directly and links to official docs at **https://code.claude.com/docs/** for deep dives.

### What You'll Learn

| Topic | Pro-Workflow Pattern | Official Docs |
|-------|---------------------|---------------|
| Sessions & context management | Pattern 7: Context Discipline | Common Workflows |
| Modes (Plan/Normal/Auto) | Pattern 5: 80/20 Review | Common Workflows |
| CLAUDE.md & project memory | Pattern 4: Split Memory | Settings |
| Writing rules & constraints | Pattern 1: Self-Correction Loop | Settings |
| Effective prompting | Pattern 5: 80/20 Review | — |
| Skills & automation | Pattern 8: Learning Log | Settings |
| Subagents & parallelism | Pattern 2: Parallel Worktrees | Sub-agents |
| Hooks & quality gates | All hooks in hooks.json | Hooks |
| Security & permissions | — | Security |
| MCP configuration | Pattern 7: Context Discipline | MCP |

### Learning Path

1. **Start** — CLI shortcuts, context management, modes
2. **Build** — CLAUDE.md, writing rules, prompting, skills
3. **Scale** — Subagents, hooks, MCP, GitHub Actions
4. **Optimize** — Pro-Workflow patterns 1-8 for production use
5. **Reference** — Official docs for deep dives on any topic

### Use /learn

Run `/learn` for a topic-by-topic guide with practices and official doc links.

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

## Hooks

Pro-workflow includes automated hooks to enforce the patterns.

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
| Stop | Periodic wrap-up/compact reminders |
| SessionEnd | Check uncommitted changes, prompt for learnings |

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

---

## MCP Config

Keep <10 MCPs enabled, <80 tools total.

Essential:
- `github` - PRs, issues
- `memory` - Persist learnings
- `filesystem` - File ops

See `mcp-config.example.json` for setup.

---

## Commands

| Command | Purpose |
|---------|---------|
| `/wrap-up` | End-of-session ritual |
| `/learn-rule` | Extract correction to memory |
| `/parallel` | Worktree setup guide |
| `/learn` | Claude Code best practices & save learnings |
| `/search` | Search learnings by keyword |
| `/list` | List all stored learnings |

---

## Philosophy

1. **Compound improvements** - Small corrections → big gains
2. **Trust but verify** - Let AI work, review at checkpoints
3. **Zero dead time** - Parallel sessions
4. **Memory is precious** - Yours and Claude's

---

*From Claude Code power users and real production use.*
