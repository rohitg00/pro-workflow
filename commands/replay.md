---
description: Surface relevant past learnings before starting a task.
---

# /replay - Surface Past Learnings for Current Task

Automatically find and surface relevant learnings from your pro-workflow database before you start working. Like muscle memory for your coding sessions.

## Usage

```
/replay auth middleware
/replay "file path errors"
/replay testing react components
```

## How It Works

1. Extract keywords from your current task description
2. Search the learnings database using FTS5 BM25 ranking
3. Check correction history for similar file patterns
4. Surface the top learnings with context

## What You Do

When the user runs `/replay <task description>`:

1. **Search learnings database**:
   ```bash
   sqlite3 ~/.pro-workflow/data.db "
     SELECT l.category, l.rule, l.mistake, l.correction, l.times_applied
     FROM learnings l
     JOIN learnings_fts ON l.id = learnings_fts.rowid
     WHERE learnings_fts MATCH '<keywords>'
     ORDER BY bm25(learnings_fts)
     LIMIT 8
   "
   ```

2. **Check session history for similar work**:
   ```bash
   sqlite3 ~/.pro-workflow/data.db "
     SELECT project, corrections_count, edit_count,
            ROUND(CAST(corrections_count AS FLOAT) / NULLIF(edit_count, 0) * 100, 1) as correction_rate
     FROM sessions
     WHERE project LIKE '%<keyword>%'
     ORDER BY started_at DESC
     LIMIT 5
   "
   ```

3. **Output the replay briefing**:

```
REPLAY BRIEFING: <task>
=======================

Past learnings (ranked by relevance):
  1. [Testing] Always mock external APIs in auth tests (applied 8x)
     Mistake: Called live API in tests, caused flaky failures
  2. [Navigation] Auth middleware is in src/middleware/ not src/auth/ (applied 5x)
  3. [Quality] Add error boundary around auth state changes (applied 3x)

Session history for similar work:
  - 2026-02-01: auth refactor — 23 edits, 2 corrections (8.7% rate)
  - 2026-01-28: auth middleware — 15 edits, 4 corrections (26.7% rate)
    ^ Higher correction rate — review patterns before starting

Suggested approach:
  - [based on learnings, suggest what to watch out for]
```

4. If no learnings found, say so and suggest starting with `/scout` to explore first

## Why This Is Unique

No other workflow tool has persistent FTS5-indexed learnings across sessions. This turns your past mistakes into a personal knowledge base that gets surfaced exactly when relevant.

## Related Commands

- `/search <query>` - Direct search of learnings
- `/scout` - Confidence-gated exploration before implementing
- `/insights` - Analytics on learning patterns

---

**Trigger:** Use when user says "replay", "what do I know about", "past learnings", "before I start", "remind me about", or starts a task that matches previous session patterns.
