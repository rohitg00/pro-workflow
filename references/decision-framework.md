# Decision Framework

How to score options, scope work, and communicate status. Use this when planning tasks or deciding whether to ask the user or just fix the problem.

## Task Risk Rating (1-10)

Score every task's **risk** before starting. This determines how much verification you run.

| Score | Risk Level | Example |
|-------|------------|---------|
| 1-3 | Low risk, easily reversible | Rename a variable, fix a typo, update a dependency |
| 4-6 | Moderate risk, contained blast radius | Refactor a single module, add a new endpoint, change validation logic |
| 7-8 | High risk, touches shared code | Change auth flow, modify database schema, update a public API |
| 9-10 | Critical, hard to reverse | Data migration, security fix, breaking change across consumers |

At 1-3, run lint and typecheck. At 4-6, add targeted tests. At 7-10, run the full test suite, review every changed file, and verify in staging if possible.

> **Task Risk vs Solution Thoroughness:** This scale rates the *task* (what could go wrong). The T:1-10 scale in `skills/thoroughness-scoring/SKILL.md` rates the *solution* (how complete is the implementation). A low-risk task (risk: 2) can still warrant a high-thoroughness solution (T:9) if the module is widely used.

## Contained vs Unbounded Scope

Before starting, classify the task.

**Contained**: the change stays inside one module, one file, or one function. You know all the callers. You can verify by running a single test file. Auto-fix these without asking.

**Unbounded**: the change crosses module boundaries, affects shared types, or has unknown consumers. Ask before proceeding. List every file that will change and get confirmation.

The dividing line: if you can enumerate every caller, it is contained. If you cannot, it is unbounded.

## Effort Comparison

When presenting options, show the cost of each path:

```text
Option A: Add a migration (manual: 2h, AI-assisted: 15min)
Option B: Backfill in application code (manual: 4h, AI-assisted: 30min)
Option C: Do nothing, handle at read time (manual: 30min, AI-assisted: 5min)
```

Always include the "do nothing" option. It is often the right choice.

## When to Ask vs Auto-Fix

**Auto-fix** (no confirmation needed):
- Lint errors, formatting, import sorting
- Fixing a bug you introduced in this session
- Contained scope with existing test coverage
- Thoroughness rating 1-3

**Ask first** (wait for confirmation):
- Unbounded scope changes
- Deleting files or removing features
- Changing public APIs or database schemas
- Thoroughness rating 7+
- Any destructive git operation

## The Re-Grounding Pattern

When you need to ask the user a question mid-task, always restate the context first. Do not ask bare questions. The user may have switched focus.

Bad: "Should I use Option A or B?"

Good: "I am adding rate limiting to the /api/upload endpoint (task from 10 minutes ago). The middleware can go in `src/middleware/rateLimit.ts` (Option A, new file) or inline in `src/routes/upload.ts` (Option B, smaller diff). Which do you prefer?"

Three parts: what you are doing, where you are in the task, what you need to know.

## Status Protocol

End every task report with exactly one of these statuses:

| Status | Meaning |
|--------|---------|
| `COMPLETE` | Done. All checks pass. No follow-up needed. |
| `COMPLETE_WITH_NOTES` | Done, but there are things the user should know (deprecation warnings, skipped tests, edge cases). List them. |
| `BLOCKED` | Cannot proceed. State what is blocking and what you need to unblock. |
| `NEEDS_INFO` | Missing information. Ask a specific question using the re-grounding pattern. |

Never use "I think it's done" or "this should work." Run the checks. Report the status.

## Scoring Checklist

Before reporting COMPLETE, verify:

1. Every changed file has been saved
2. Lint and typecheck pass
3. Tests pass (scoped to thoroughness rating)
4. No unintended files were modified (check `git diff --stat`)
5. The original task is fully addressed, not just partially
