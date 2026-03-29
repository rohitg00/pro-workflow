---
description: Prevent destructive operations — cautious (warn), lockdown (restrict edits), or clear
argument-hint: <cautious | lockdown <path> | clear>
---

# /safe-mode - Destructive Operation Protection

Guard against accidental damage during AI coding sessions.

## Usage

### Cautious Mode
```text
/safe-mode cautious
```
Intercepts Bash commands and warns before destructive operations:
- `rm -rf`, `DROP TABLE`, `TRUNCATE`
- `git push --force`, `git reset --hard`, `git clean -f`
- `chmod 777`, `curl|sh`

Warns on stderr. You decide whether to proceed.

### Lockdown Mode
```text
/safe-mode lockdown src/api/
```
Restricts Edit/Write operations to the specified directory. Blocks changes to files outside the path.

Session-scoped. Prevents accidental edits to unrelated code during focused work.

### Both Together
```text
/safe-mode cautious
/safe-mode lockdown src/api/
```
Bash warnings + directory restriction simultaneously.

### Clear All
```text
/safe-mode clear
```
Removes all restrictions for the current session.

## Status Check

Report current safe-mode state:
```text
SAFE MODE STATUS
  Cautious: ACTIVE (warns on destructive Bash commands)
  Lockdown: ACTIVE (restricted to src/api/)
```

Or:
```text
SAFE MODE STATUS
  No restrictions active.
```

## When to Use

| Situation | Command |
|-----------|---------|
| Production-adjacent code | `/safe-mode cautious` |
| Focused refactoring | `/safe-mode lockdown <path>` |
| Unfamiliar codebase | `/safe-mode cautious` |
| Done with restrictions | `/safe-mode clear` |

---

**Trigger:** Use when starting risky work, refactoring a specific module, or wanting guardrails on AI operations.
