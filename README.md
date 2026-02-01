# Pro Workflow

[![GitHub stars](https://img.shields.io/github/stars/rohitg00/pro-workflow?style=social)](https://github.com/rohitg00/pro-workflow)

Battle-tested Claude Code workflows from power users. Self-correcting memory, parallel worktrees, wrap-up rituals, and the 80/20 AI coding ratio.

**If this helps your workflow, please give it a star!**

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
| `/pro-workflow:learn-rule` | Extract correction to memory |
| `/pro-workflow:parallel` | Worktree setup guide |

## Hooks

Automated enforcement of workflow patterns.

| Hook | When | What |
|------|------|------|
| PreToolUse | Before edits | Track edit count, quality gate reminders |
| PreToolUse | Before git commit/push | Remind about quality gates, wrap-up |
| PostToolUse | After code edits | Check for console.log, TODOs, secrets |
| PostToolUse | After tests | Suggest [LEARN] from failures |
| SessionStart | New session | Load LEARNED patterns |
| Stop | Each response | Periodic wrap-up reminders |
| SessionEnd | Session close | Check uncommitted changes |

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

## Structure

```
pro-workflow/
├── .claude-plugin/
│   ├── plugin.json           # Plugin manifest
│   ├── marketplace.json      # Marketplace config
│   └── README.md
├── skills/
│   └── pro-workflow/
│       └── SKILL.md          # Main skill
├── agents/
│   ├── planner.md
│   └── reviewer.md
├── commands/
│   ├── wrap-up.md
│   ├── learn-rule.md
│   └── parallel.md
├── hooks/
│   └── hooks.json
├── scripts/                  # Hook scripts
├── contexts/
│   ├── dev.md
│   ├── review.md
│   └── research.md
├── rules/
│   └── core-rules.md
├── templates/
│   └── split-claude-md/
└── README.md
```

## Also Available via SkillKit

Install skills across 32+ AI coding agents with [SkillKit](https://agenstskills.com):

```bash
npx skillkit install pro-workflow
```

Explore more skills at [agenstskills.com](https://agenstskills.com)

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
