# /commit - Smart Commit with Quality Gates

Create a well-crafted commit after running pro-workflow quality checks.

## Process

### 1. Pre-Commit Checks

```bash
git status
git diff --stat
```

- Any unstaged changes to include?
- Any files that shouldn't be committed (.env, credentials, large binaries)?

### 2. Quality Gates

```bash
npm run lint 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm test -- --changed --passWithNoTests 2>&1 | tail -10
```

- All checks passing? If not, fix before committing.
- Skip only if user explicitly says to.

### 3. Code Review

Scan staged changes for:
- `console.log` / `debugger` statements
- TODO/FIXME/HACK comments without tickets
- Hardcoded secrets or API keys
- Leftover test-only code

Flag any issues before proceeding.

### 4. Commit Message

Draft a commit message based on the staged diff:

```
<type>(<scope>): <short summary>

<body - what changed and why>
```

**Types:** feat, fix, refactor, test, docs, chore, perf, ci, style

**Rules:**
- Summary under 72 characters
- Body explains *why*, not *what*
- Reference issue numbers when applicable
- No generic messages ("fix bug", "update code")

### 5. Stage and Commit

```bash
git add <specific files>
git commit -m "<message>"
```

- Stage specific files, not `git add -A`
- Show the commit hash and summary after

### 6. Learning Check

After committing, ask:
- Any learnings from this change to capture?
- Any patterns worth adding to LEARNED?

## Usage

```
/commit
/commit --no-verify
/commit --amend
```

## Options

- **--no-verify**: Skip quality gates (use sparingly)
- **--amend**: Amend the previous commit instead of creating new
- **--push**: Push to remote after commit

## Example Flow

```
> /commit

Pre-commit checks:
  Lint: PASS
  Types: PASS
  Tests: 12/12 PASS

Staged changes:
  src/auth/login.ts (+45 -12)
  src/auth/session.ts (+8 -3)

Suggested commit:
  feat(auth): add rate limiting to login endpoint

  Limit login attempts to 5 per IP per 15 minutes using
  Redis-backed sliding window. Returns 429 with Retry-After
  header when exceeded.

  Closes #142

Commit? (y/n)
```

## Related Commands

- `/wrap-up` - Full end-of-session checklist
- `/learn-rule` - Capture a learning after committing

---

**Trigger:** Use when user says "commit", "save changes", "commit this", or is ready to commit after making changes.
