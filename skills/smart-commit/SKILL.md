---
name: smart-commit
description: Run quality gates, review staged changes for issues, and create a well-crafted conventional commit. Use when saying "commit", "git commit", "save my changes", or ready to commit after making changes.
---

# Smart Commit

## Trigger

Use when saying "commit", "save changes", or ready to commit after making changes.

## Workflow

1. Check current state and identify what to commit.
2. Run quality gates (lint, typecheck, tests on affected files).
3. Scan staged changes for issues.
4. Draft a conventional commit message from the diff.
5. Stage specific files, create the commit.
6. Prompt for learnings from this change.

## Commands

```bash
git status
git diff --stat

npm run lint 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm test -- --changed --passWithNoTests 2>&1 | tail -10

git add <specific files>
git commit -m "<type>(<scope>): <summary>"
```

## Code Review Scan

Before committing, check staged changes in **production code** (not test files) for:
- `console.log` / `debugger` statements (suppressed in test files — see Review Suppressions)
- TODO/FIXME/HACK comments without ticket references (e.g., `TODO(JIRA-123)` is fine)
- Hardcoded secrets or API keys
- Leftover test-only code

Flag any issues before proceeding.

## Commit Message Format

```
<type>(<scope>): <short summary>

<body - what changed and why>
```

**Types:** feat, fix, refactor, test, docs, chore, perf, ci, style

## Guardrails

- Never skip quality gates unless user explicitly says to.
- Stage specific files by name. Never `git add -A` or `git add .`.
- Summary under 72 characters. Body explains *why*, not *what*.
- No generic messages ("fix bug", "update code").
- Reference issue numbers when applicable.

## Output

- Quality gate results (pass/fail)
- Issues found in staged changes
- Suggested commit message
- Commit hash after committing
- Prompt: any learnings to capture?

## Review Suppressions

Do NOT flag these during the pre-commit scan. They add noise without catching real bugs:
- Threshold, config value, or feature flag changes (limits, timeouts, retry counts)
- Import reordering that does not change runtime behavior
- Whitespace-only or formatting-only changes
- Adding or removing `console.log` in test files
- TODO/FIXME comments (tracked separately in issue trackers)
- Variable or parameter renames that do not change behavior
