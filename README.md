# Pro Workflow

Battle-tested Claude Code workflows from power users. Self-correcting memory, parallel worktrees, wrap-up rituals, and the 80/20 AI coding ratio.

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

## Quick Start

### Minimal Setup

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

## Commands

| Command | Purpose |
|---------|---------|
| `/wrap-up` | End-of-session checklist |
| `/learn-rule` | Extract correction to memory |
| `/parallel` | Worktree setup guide |

## Structure

```
pro-workflow/
├── SKILL.md              # Main skill
├── README.md             # This file
├── config.json           # Options
├── commands/
│   ├── wrap-up.md        # Session wrap-up
│   ├── learn-rule.md     # Correction capture
│   └── parallel.md       # Worktree guide
└── templates/
    └── split-claude-md/
        ├── CLAUDE.md     # Entry point
        ├── AGENTS.md     # Workflow rules
        ├── SOUL.md       # Style prefs
        └── LEARNED.md    # Auto-populated
```

## Install via SkillKit

```bash
skillkit install pro-workflow
```

## Philosophy

1. **Compound improvements** - Small corrections → big gains over time
2. **Trust but verify** - Let AI work, review at checkpoints
3. **Zero dead time** - Parallel sessions keep momentum
4. **Memory is precious** - Both yours and Claude's

---

*Distilled from Claude Code power users and real production use.*
