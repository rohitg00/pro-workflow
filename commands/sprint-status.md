---
description: Show status across active parallel sessions
---

# /sprint-status - Parallel Session Tracker

Report status across all active Claude Code sessions.

## Process

1. **Detect active sessions:**
   ```bash
   pgrep -af "claude" | grep -v "$$" | head -10
   git worktree list 2>/dev/null
   ls $TMPDIR/pro-workflow/sessions/ 2>/dev/null | tail -5
   ```

2. **Report current session:**
   ```text
   SESSION: <project> | branch: <branch> | task: <current task>
   STATUS: COMPLETE | COMPLETE_WITH_NOTES | BLOCKED | NEEDS_INFO
   ```

3. **Compile sprint view** (if multiple sessions detected):
   ```text
   SPRINT STATUS
     Session 1: feat/auth       STATUS: COMPLETE         (ready to merge)
     Session 2: feat/upload     STATUS: BLOCKED          (waiting on S3 creds)
     Session 3: fix/login-bug   STATUS: COMPLETE_WITH_NOTES (needs perf review)
   ```

## Status Definitions

| Status | Meaning |
|--------|---------|
| `COMPLETE` | Done, ready to commit or merge |
| `COMPLETE_WITH_NOTES` | Done, but flagging observations |
| `BLOCKED` | Cannot proceed, needs input or external dep |
| `NEEDS_INFO` | Missing context, asking before guessing |

## When to Use

- Before switching between terminal tabs/sessions
- At the end of a work phase
- When asking "where was I?"
- To orient after being away

---

**Trigger:** Use when running parallel sessions, resuming work, or wanting a quick snapshot of progress across branches.
