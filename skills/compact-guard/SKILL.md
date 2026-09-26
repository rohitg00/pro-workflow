---
name: compact-guard
description: Smart context compaction with state preservation. Saves critical files, task progress, and working state before compaction, restores after. Use before manual compact or when auto-compact triggers.
user-invocable: true
---

# Compact Guard

Protect important context through compaction cycles. Compaction restores only a few recently read files, so write down anything else the next turn needs.

## Trigger

Use before `/compact` or when auto-compact warning appears.

## Pre-Compact Checklist

Before compacting, save these to memory or a scratch file:

1. **Current task** — What are you working on? One sentence.
2. **Files in progress** — Which files are being edited? Most important first
3. **Decisions made** — Any architectural choices made this session
4. **Blockers** — What's preventing progress?
5. **Next steps** — What to do immediately after compact

## Strategy: Microcompact First

Before full compaction, try microcompact:
- Large tool results (test output, grep results) can be trimmed
- File reads that are no longer relevant can be dropped
- Use subagents for heavy exploration to keep main context clean

## Post-Compact Recovery

After compaction, immediately:

1. Re-read the top-priority file (the one you're actively editing)
2. Check task list for current progress
3. Review any scratch notes saved pre-compact
4. Resume from next steps

## Prevention Strategies

| Strategy | Token Savings | When |
|----------|--------------|------|
| Delegate grep/search to subagent | 30-60% per search | Always for broad searches |
| Read only needed lines (`offset`/`limit`) | 50-90% per read | Large files |
| Compact at task boundaries | Preserves coherence | Between logical steps |
| Use `/clear` for fresh start | 100% | Unrelated new task |

## Output

After running compact-guard:
```text
COMPACT GUARD
  Files to preserve: [priority order]
  Task state: [one sentence]
  Decisions: [key choices]
  Next step: [immediate action after compact]

  Ready to compact. Run /compact now.
```

## Rules

- Always save state before compacting — never compact blind
- Prioritize the file you're actively editing as #1 to restore
- If auto-compact fires unexpectedly, immediately re-read your working file
- Keep CLAUDE.md under 60 lines to leave room for actual context
