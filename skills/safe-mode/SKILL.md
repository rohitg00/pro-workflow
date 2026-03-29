---
name: safe-mode
description: Prevent destructive operations using Claude Code hooks. Three modes — cautious (warn on dangerous commands), lockdown (restrict edits to one directory), and clear (remove restrictions). Uses PreToolUse matchers for Bash, Edit, and Write.
hooks:
  PreToolUse:
    - matcher: "tool == \"Bash\""
      description: "Intercept shell commands and check for destructive operations"
    - matcher: "tool == \"Edit\" || tool == \"Write\""
      description: "Enforce directory lockdown when active"
---

# Safe Mode

Three levels of protection against destructive operations during AI coding sessions.

> **Note:** These hooks are skill-scoped — they only activate when you invoke `/safe-mode`. The global `permission-request.js` hook in hooks.json provides always-on alerting for dangerous commands. Safe-mode adds opt-in blocking and directory restrictions on top of that.

## Modes

### Cautious Mode

```text
/safe-mode cautious
```

Intercepts Bash commands before execution. Warns on dangerous patterns but does not block — the user decides.

**Flagged patterns:**

| Pattern | Risk |
|---------|------|
| `rm -rf` / `rm -r` | Recursive deletion |
| `DROP TABLE` / `DROP DATABASE` | SQL data loss |
| `TRUNCATE` | SQL data destruction |
| `git push --force` / `git push -f` | Remote history rewrite |
| `git reset --hard` | Local history loss |
| `git clean -f` | Untracked file deletion |
| `git checkout .` / `git restore .` | Discard all changes |
| `chmod 777` | World-writable permissions |
| `curl \| sh` / `wget \| sh` | Piped remote execution |
| `> /dev/sda` / `dd if=` | Disk-level operations |
| `:(){ :\|:& };:` | Fork bombs |
| `sudo rm` | Elevated deletion |

**What happens:**

```text
WARNING: Destructive operation detected
  Command: rm -rf ./build
  Pattern: rm -rf (recursive forced deletion)
  Risk: Permanently deletes ./build and all contents

  Proceed? The command will execute as-is if you continue.
```

The warning goes to stderr. Claude sees it and asks for confirmation before proceeding.

### Lockdown Mode

```text
/safe-mode lockdown <path>
```

Restricts Edit and Write operations to a single directory tree. Prevents accidental changes to unrelated code.

**How it works:**

1. Set the allowed path (absolute or relative to repo root)
2. Every Edit/Write call checks if the target file is inside the allowed path
3. Operations outside the path are blocked with an explanation

```text
LOCKDOWN ACTIVE: Edits restricted to src/api/

  Blocked: Edit to src/utils/helpers.ts
  Reason: File is outside the lockdown path (src/api/)

  To edit files outside the lockdown, run: /safe-mode clear
```

**Use cases:**

- Focused refactoring of one module without touching others
- Bug fix in a specific directory while tests run elsewhere
- Junior developer guardrail — scope the blast radius
- Code review session — only edit the files under review

**Scope:** Session-scoped. Resets when the session ends.

### Clear

```text
/safe-mode clear
```

Removes all restrictions for the current session. Both cautious warnings and lockdown restrictions are disabled.

```text
SAFE MODE: All restrictions cleared for this session.
```

## Implementation

### PreToolUse Hook — Bash (Cautious Mode)

The hook inspects `tool_input.command` before every Bash execution:

```javascript
const DANGEROUS_PATTERNS = [
  { pattern: /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s|--recursive|--force)/, label: "rm with -rf flags" },
  { pattern: /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW)\b/i, label: "DROP SQL statement" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE SQL statement" },
  { pattern: /\bgit\s+push\s+(-[a-zA-Z]*f|--force)/, label: "git force-push" },
  { pattern: /\bgit\s+reset\s+--hard\b/, label: "git hard reset" },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*f/, label: "git clean -f" },
  { pattern: /\bgit\s+(checkout|restore)\s+\./, label: "git discard all changes" },
  { pattern: /\bchmod\s+777\b/, label: "chmod 777" },
  { pattern: /\bcurl\b.*\|\s*(sh|bash)\b/, label: "piped remote execution" },
  { pattern: /\bwget\b.*\|\s*(sh|bash)\b/, label: "piped remote execution" },
  { pattern: /\bsudo\s+rm\b/, label: "elevated deletion" },
];
```

Match found → emit warning to stderr. No match → pass through silently.

### PreToolUse Hook — Edit/Write (Lockdown Mode)

The hook checks `tool_input.file_path` against the lockdown path:

```javascript
function isInsideLockdown(filePath, lockdownPath) {
  const resolved = path.resolve(filePath);
  const allowed = path.resolve(lockdownPath);
  return resolved.startsWith(allowed + path.sep) || resolved === allowed;
}
```

Inside lockdown path → pass through. Outside → block with explanation.

### State

Mode state lives in a session-scoped temp file (keyed by session ID to avoid cross-session leaks):

```text
$TMPDIR/pro-workflow/safe-mode-<sessionId>.json
{
  "mode": "lockdown",
  "lockdownPath": "/Users/dev/project/src/api",
  "sessionId": "abc123",
  "activatedAt": "2026-03-28T10:00:00Z"
}
```

Cleared on session end or `/safe-mode clear`. Each session has its own state file.

## Combining Modes

Cautious and lockdown can run simultaneously:

```text
/safe-mode cautious
/safe-mode lockdown src/api/
```

Now you get:
- Bash command warnings for destructive operations
- Edit/Write restrictions to `src/api/` only

Clear removes both.

## When to Use

| Situation | Mode |
|-----------|------|
| Working on production-adjacent code | Cautious |
| Focused refactoring of one module | Lockdown |
| Unfamiliar codebase, feeling cautious | Cautious |
| Pair programming, limiting AI scope | Lockdown |
| Done with restrictions | Clear |

## Anti-Patterns

- Leaving lockdown on when you need to edit tests (update the path or clear it)
- Using safe-mode as a substitute for git branches (branches protect history, safe-mode protects the session)
- Ignoring cautious warnings repeatedly (if you always proceed, turn it off — false confidence is worse)
