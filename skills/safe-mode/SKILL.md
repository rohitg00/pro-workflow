---
name: safe-mode
description: Prevent destructive operations using Claude Code hooks. Three modes — cautious (warn on dangerous commands), lockdown (restrict edits to one directory), and clear (remove restrictions). Uses PreToolUse matchers for Bash, Edit, and Write.
user-invocable: true
hooks:
  PreToolUse:
    - matcher: "Bash|Edit|Write"
      hooks:
        - type: command
          command: "node \"${CLAUDE_PLUGIN_ROOT}/scripts/safe-mode-guard.js\""
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
| `curl` or `wget` piped to a shell | Piped remote execution |
| `> /dev/sda` / `dd if=` | Disk-level operations |
| `:(){ :\|:& };:` | Fork bombs |
| `sudo rm` | Elevated deletion |

**What happens:** the hook returns a permission `ask`, so Claude Code shows you a prompt that names the pattern, for example `Safe mode: rm with -r or -f`. You approve or reject the command. This prompt appears even in auto mode.

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

**Scope:** Keyed to the project root. It stays set until `/safe-mode clear`, and only enforces in sessions where `/safe-mode` was invoked.

### Clear

```text
/safe-mode clear
```

Removes all restrictions for the current session. Both cautious warnings and lockdown restrictions are disabled.

```text
SAFE MODE: All restrictions cleared for this session.
```

## Implementation

Invoking this skill registers one `PreToolUse` hook for `Bash|Edit|Write` that runs `scripts/safe-mode-guard.js`. Skill hooks stay registered for the rest of the session. The guard does nothing until a mode is set.

### Set the mode

When the user runs `/safe-mode <mode>`, run the guard's setter from the project root:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/safe-mode-guard.js" set cautious
node "${CLAUDE_PLUGIN_ROOT}/scripts/safe-mode-guard.js" set lockdown src/api/
node "${CLAUDE_PLUGIN_ROOT}/scripts/safe-mode-guard.js" set clear
```

Then report the line the setter prints.

### Cautious (Bash)

The guard checks `tool_input.command` against a fixed list of destructive patterns: recursive or forced `rm`, `DROP` and `TRUNCATE`, force-push, hard reset, `git clean -f`, discarding all changes, `chmod 777`, piping `curl` or `wget` to a shell, disk-level writes, fork bombs, and `sudo rm`. A match returns `permissionDecision: "ask"` with the pattern as the reason. No match passes through.

### Lockdown (Edit and Write)

The guard resolves `tool_input.file_path` against the project root, follows symlinks, and checks that it sits inside the lockdown path. Inside passes through. Outside exits 2, which blocks the edit and tells Claude why.

### State

The mode lives in `$TMPDIR/pro-workflow/safe-mode-<hash>.json`, keyed by the project root, so two projects never share it:

```json
{ "cautious": true, "lockdownPath": "/Users/dev/project/src/api", "root": "/Users/dev/project" }
```

`set clear` deletes the file. The file outlives the session, so clear it when you are done; a new session only enforces it again after `/safe-mode` is invoked, because the hook is skill-scoped.

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
