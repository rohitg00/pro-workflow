---
description: Write a session handoff with progress, decisions, and next steps.
---

# /handoff - Session Handoff Document

Generate a structured handoff document that another Claude session (or your future self) can consume immediately to continue where you left off.

## Usage

```
/handoff
/handoff --full
/handoff --compact
```

## How It Works

When the user runs `/handoff`:

1. **Gather current state**:
   - Run `git status` and `git diff --stat` to see uncommitted work
   - Run `git log --oneline -5` to see recent commits this session
   - Check the session's edit count and corrections from the database
   - List files modified this session

2. **Query learnings captured this session**:
   ```bash
   sqlite3 ~/.pro-workflow/data.db "
     SELECT category, rule, mistake, correction
     FROM learnings
     WHERE created_at >= datetime('now', '-4 hours')
     ORDER BY created_at DESC
   "
   ```

3. **Generate the handoff document**:

```markdown
# Session Handoff — [date] [time]

## Status
- **Branch**: feature/xyz
- **Commits this session**: 3
- **Uncommitted changes**: 2 files modified
- **Tests**: passing / failing / not run

## What's Done
- [completed task 1]
- [completed task 2]

## What's In Progress
- [current task with context on where you stopped]
- [file:line that needs attention next]

## What's Pending
- [next task that hasn't been started]
- [blocked items with reason]

## Key Decisions Made
- [decision 1 and why]
- [decision 2 and why]

## Learnings Captured
- [Category] Rule (from this session)

## Files Touched
- `path/to/file1.ts` — [what changed]
- `path/to/file2.ts` — [what changed]

## Gotchas for Next Session
- [thing that tripped you up]
- [non-obvious behavior discovered]

## Resume Command
Copy this into your next session:
> Continue working on [branch]. [1-2 sentence context]. Next step: [specific action].
```

4. **Save the handoff** to `~/.pro-workflow/handoffs/[date]-[branch].md`

## Options

- **default**: Standard handoff with all sections
- **--full**: Include full git diff in the document
- **--compact**: Just the resume command and key context (for pasting into next session)

## Why This Is Different from /wrap-up

`/wrap-up` is a checklist to close a session properly. `/handoff` is a document designed to be consumed by the next session — it's written for the reader, not the writer.

## Related Commands

- `/wrap-up` - End-of-session checklist (do this first, then handoff)
- `/replay` - Surface past learnings when starting a new session
- `/insights` - Session analytics

---

**Trigger:** Use when user says "handoff", "hand off", "pass to next session", "create handoff", "session transfer", "continue later", or when ending a session and wants to resume smoothly.
