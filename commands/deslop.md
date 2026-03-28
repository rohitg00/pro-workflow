# /deslop - Remove AI Code Slop

Strip AI-generated slop from the current branch.

## Process

1. **Diff the branch against main:**
   ```bash
   git fetch origin main
   git diff origin/main...HEAD --stat
   git diff origin/main...HEAD
   ```

2. **Scan for slop patterns:**
   - Comments that state the obvious or don't match local style
   - Defensive try/catch blocks on trusted internal code paths
   - Casts to `any` used only to bypass type issues
   - Over-engineered abstractions for one-time operations
   - Deeply nested code that should use early returns
   - Backwards-compatibility hacks (renamed `_vars`, re-exports, `// removed` comments)
   - Features or "improvements" beyond what was requested
   - Docstrings and type annotations added to unchanged code
   - Error handling for scenarios that can't happen

3. **Apply minimal edits** to remove each slop instance.

4. **Verify behavior unchanged:**
   ```bash
   git diff origin/main...HEAD
   npm test -- --changed --passWithNoTests 2>&1 | tail -10
   ```

5. **Report** what was cleaned (1-3 sentences).

## Guardrails

- Keep behavior unchanged unless fixing a clear bug.
- Prefer minimal edits over broad rewrites.
- Three similar lines is better than a premature abstraction.
- Verify something is truly unused before removing it.

---

**Trigger:** Use when code feels bloated, before committing, after AI-heavy sessions, or when someone says "clean this up".
