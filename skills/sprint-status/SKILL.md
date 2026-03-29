---
name: sprint-status
description: Track parallel work sessions and prevent confusion across multiple Claude Code instances. Every major step ends with a status line. Every question re-states project, branch, and task.
---

# Sprint Status

When running multiple Claude Code sessions in parallel, confusion is the enemy. This skill ensures every session identifies itself and every step reports its state.

## Session Identification

Every response that involves a decision, plan, or significant action starts with orientation:

```text
SESSION: my-app | branch: feat/auth | task: Add JWT refresh tokens
```

This takes one line. It costs almost nothing. It prevents the user from applying feedback to the wrong session.

### Detecting Parallel Sessions

Check for sibling Claude Code processes:

```bash
pgrep -af "claude" | grep -v "$$" | head -5
```

Or check for active worktrees:

```bash
git worktree list 2>/dev/null
```

Or look for session markers:

```bash
ls ~/.claude/sessions/ 2>/dev/null | tail -5
```

If multiple sessions are detected, always include the session identification header. If only one session is running, include it at task boundaries and before presenting options.

## Status Lines

End every major step with exactly one status line. No ambiguity.

### STATUS: COMPLETE

All work for the current step is done. Ready to commit, merge, or move to the next task.

```text
STATUS: COMPLETE
  Changed: src/auth/refresh.ts, src/auth/refresh.test.ts
  Tests: 14 pass, 0 fail
  Ready to commit.
```

### STATUS: COMPLETE_WITH_NOTES

Done, but flagging something the user should know about.

```text
STATUS: COMPLETE_WITH_NOTES
  Changed: src/api/upload.ts
  Tests: 8 pass, 0 fail
  Notes:
    - Upload size limit is hardcoded to 10MB, should be configurable
    - No rate limiting on this endpoint yet (separate task)
```

Notes are for things that work but could be better. Not blockers — observations.

### STATUS: BLOCKED

Cannot proceed without user input or an external dependency.

```text
STATUS: BLOCKED
  Blocker: Need database migration approved before writing the ORM layer
  Waiting on: DBA approval for schema change in migrations/0042_add_tokens.sql
  Can continue: Nothing else in this task until unblocked
```

### STATUS: NEEDS_INFO

Missing context to make a good decision. Asking before guessing.

```text
STATUS: NEEDS_INFO
  Question: Should refresh tokens expire after 7 days or 30 days?
  Impact: Changes token cleanup job schedule and storage requirements
  Default if no preference: 7 days (more secure, standard practice)
```

Always provide a sensible default so the user can say "go with the default" without context-switching into the decision.

## Parallel Session Patterns

### Pattern 1: Feature + Tests

```text
Session 1: feat/auth       → implementing JWT refresh
Session 2: feat/auth-tests → writing test suite for auth module
```

Both sessions work on the same feature but don't touch the same files. Session 2 can start writing tests against the interface before Session 1 finishes the implementation.

### Pattern 2: Independent Features

```text
Session 1: feat/upload     → file upload endpoint
Session 2: feat/billing    → billing webhook handler
Session 3: fix/login-bug   → login redirect fix
```

Completely independent. Merge order doesn't matter.

### Pattern 3: Stacked Changes

```text
Session 1: feat/base-types → shared type definitions (must merge first)
Session 2: feat/api        → API layer (depends on Session 1)
Session 3: feat/ui         → UI layer (depends on Session 1)
```

Session 1 merges first. Sessions 2 and 3 rebase after. Flag the dependency in every status update.

## When to Report Status

| Event | Include Status? |
|-------|----------------|
| File edit completed | No (too granular) |
| Test suite run | Yes, if pass/fail changed |
| Phase completed (research, plan, implement) | Yes |
| Presenting options to user | Yes (with session header) |
| Hitting a blocker | Yes, immediately |
| Before asking a question | Yes (NEEDS_INFO) |
| After committing | Yes (COMPLETE) |
| End of session | Yes (final status) |

## Sprint Dashboard

When the user asks for status across sessions, compile a sprint view:

```text
SPRINT STATUS
  Session 1: feat/auth       STATUS: COMPLETE         (ready to merge)
  Session 2: feat/upload     STATUS: BLOCKED          (waiting on S3 creds)
  Session 3: fix/login-bug   STATUS: COMPLETE_WITH_NOTES (works, needs perf review)
```

## Anti-Patterns

- Skipping the session header when multiple sessions are active
- Using STATUS: COMPLETE when there are known issues (use COMPLETE_WITH_NOTES)
- Burying the status line in a paragraph (put it on its own line, at the end)
- Reporting status after every single edit (only at meaningful boundaries)
- Not providing a default with NEEDS_INFO (forces the user to context-switch fully)
- Saying "almost done" or "mostly working" instead of a concrete status

## Add to CLAUDE.md

```markdown
## Sprint Status

Every decision and plan starts with: SESSION: project | branch | task
End major steps with STATUS: COMPLETE | COMPLETE_WITH_NOTES | BLOCKED | NEEDS_INFO
NEEDS_INFO always includes a sensible default.
When parallel sessions are detected, always include session headers.
```
