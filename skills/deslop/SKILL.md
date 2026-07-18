---
name: deslop
description: Remove AI-generated code slop, unnecessary comments, and over-engineering from the current branch diff. Cleans up boilerplate, simplifies abstractions, strips defensive code, and in skill-file mode lints SKILL.md files for quality. Use when cleaning up code, simplifying, removing boilerplate, before committing, or when reviewing a skill before promoting it.
---

# Remove AI Code Slop

Check the diff against main and remove AI-generated slop introduced in the branch.

## Trigger

Use after completing changes, before committing, or when code feels over-engineered.

## Commands

```bash
git fetch origin main
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

## Workflow

1. Run diff commands to see all changes on the branch.
2. Identify slop patterns from the focus areas below.
3. Apply minimal, focused edits to remove slop.
4. Re-run `git diff origin/main...HEAD` to verify only slop was removed.
5. Run tests or type-check to confirm behaviour unchanged: `npm test -- --changed --passWithNoTests 2>&1 | tail -10`
6. Summarise what was cleaned.

## Focus Areas

- Extra comments that state the obvious or are inconsistent with local style
- Defensive try/catch blocks that are abnormal for trusted internal code paths
- Casts to `any` used only to bypass type issues
- Over-engineered abstractions for one-time operations (premature helpers, factories)
- Deeply nested code that should be simplified with early returns
- Backwards-compatibility hacks (renamed `_vars`, re-exports, `// removed` comments)
- Features, refactoring, or "improvements" beyond what was requested
- Added docstrings, type annotations, or comments on code that wasn't changed
- Error handling for scenarios that can't happen in trusted internal paths

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal, focused edits over broad rewrites.
- Three similar lines of code is better than a premature abstraction.
- If you remove something, verify it's truly unused first.
- Keep the final summary concise (1-3 sentences).

## Skill-file mode

When the target is a `SKILL.md` (not a code diff), lint it against the same
slop instinct applied to prose. Run this before promoting a skill. Flag:

- **Stale lines** - guidance written for an old version of the skill that no
  longer matches what it does. Cut it.
- **Bloat** - the skill runs past one screen with detail that belongs in a
  linked reference. Push it down: in-skill step, then in-skill reference, then
  an external file behind a pointer.
- **Dead sentences** - a line that changes nothing if deleted. Delete it.
- **Duplication** - the same instruction stated in two places, so edits drift.
  Keep one source of truth.
- **Premature stop** - the method ends before the work does (asks the question
  but never records the answer, cleans but never verifies).
- **Weak anchor** - no single concept the skill turns on. A skill the reader
  can name in one word triggers and executes in fewer tokens.
- **Missing invocation intent** - no declared human-run vs auto-triggered mode.
  See [`rules/skill-conventions.mdc`](../../rules/skill-conventions.mdc).
- **Wrong write op** - a state-changing skill that does not say whether it
  adds, updates, or appends, or that duplicates its output on a second run.

**Skill-file mode output:** the flagged issues by line, the edits applied,
the cleanup summary, and whether the skill is ready to promote.

## Output (code mode)

- List of slop patterns found with file locations
- Edits applied
- One-line summary of what was cleaned
