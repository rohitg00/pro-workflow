---
description: Smart context compaction with state preservation — saves critical state before compact and restores after
---

# /compact-guard - Protected Compaction

Protect your working context through compaction.

## Quick Start

Run before `/compact` to:
1. Save your current task state
2. Note which files you're editing (max 5 survive compaction)
3. Record decisions made this session
4. Compact safely
5. Restore critical context after

## When To Use

- Before manual `/compact`
- When you see auto-compact warnings
- At natural task boundaries

## Key Insight

Claude Code only restores **5 files** after compaction, with **5K tokens per file** and **50K total budget**. Plan accordingly:
- Prioritize the file you're actively editing
- Move exploration results to subagents
- Keep notes in a scratch file

## Usage

```text
/compact-guard
```
