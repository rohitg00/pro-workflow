---
description: Diagnose pro-workflow setup and Claude Code configuration
---

# /doctor - Configuration Health Check

Run a diagnostic on your pro-workflow and Claude Code setup.

## Check These

### 1. Pro-Workflow Installation
```bash
ls -la ~/.claude/commands/wrap-up.md 2>/dev/null && echo "Commands: OK" || echo "Commands: MISSING"
ls -la ~/.pro-workflow/data.db 2>/dev/null && echo "Database: OK" || echo "Database: MISSING"
```

### 2. Hooks Status
Check if hooks.json is loaded and hooks are active. Run:
```bash
cat ~/.claude/settings.local.json 2>/dev/null | head -5
```

If hooks aren't firing, check:
- hooks.json is in the right location
- Script paths use `${CLAUDE_PLUGIN_ROOT}` or absolute paths
- Scripts have execute permissions

### 2a. Deterministic Hook Sanity
Verify the hook scripts run without an LLM:
```bash
echo '{"tool_input":{"command":"git commit -m \"feat: x\""}}' | node "$CLAUDE_PLUGIN_ROOT/scripts/commit-validate.js" && echo "commit-validate: OK"
echo '{"tool_input":{"content":"hello"}}' | node "$CLAUDE_PLUGIN_ROOT/scripts/secret-scan.js" && echo "secret-scan: OK"
echo '{"tool_input":{"command":"ls"}}' | node "$CLAUDE_PLUGIN_ROOT/scripts/git-blast-radius.js" && echo "git-blast-radius: OK"
echo '{"tool_input":{"command":"git reset --hard"}}' | node "$CLAUDE_PLUGIN_ROOT/scripts/git-blast-radius.js" 2>&1 | grep -q blocked && echo "git-blast-radius blocking: OK"
```
All should confirm OK. These hooks used to depend on `"model": "haiku"` (fixed in issue #47).

### 2b. Git Safety Override
If you need to run a blocked git operation deliberately (e.g. intentional
`git reset --hard` during recovery), export `PRO_WORKFLOW_ALLOW_UNSAFE_GIT=1`
for the shell that will run it. Never set it globally.

### 3. Context Health
```text
/context
```
- Usage < 70%: Healthy
- Usage 70-90%: Consider `/compact`
- Usage > 90%: Compact immediately or start fresh

### 4. MCP Servers
Check active MCPs. Target: <10 servers, <80 tools.

### 5. CLAUDE.md Size
```bash
wc -l CLAUDE.md 2>/dev/null || echo "No CLAUDE.md found"
```
- < 60 lines: Ideal
- 60-150 lines: Acceptable
- > 150 lines: Too long, split into modules

### 6. Git Status
```bash
git status --short
git stash list
```
- Uncommitted changes? Commit or stash.
- Stale stashes? Clean up.

### 7. Settings Validation
```bash
cat .claude/settings.json 2>/dev/null | head -3
cat ~/.claude/settings.json 2>/dev/null | head -3
```
- Check for conflicting settings between project and user level
- Verify permission rules are correct

## Quick Fixes

| Issue | Fix |
|-------|-----|
| Commands missing | `cp -r /path/to/pro-workflow/commands/* ~/.claude/commands/` |
| Database missing | `mkdir -p ~/.pro-workflow && npm run build` (in plugin dir) |
| Hooks not firing | Check paths in hooks.json use absolute paths |
| Context degraded | Run `/compact` or start fresh session |
| Too many MCPs | Disable unused: `disabledMcpjsonServers` in settings |
| CLAUDE.md too long | Split into root + package-level files |

## Report

After running checks, summarize:
```text
Pro-Workflow Health Check
  Installation:  OK / NEEDS SETUP
  Hooks:         ACTIVE / INACTIVE
  Context:       XX% (healthy/warning/critical)
  MCPs:          X active (OK / TOO MANY)
  CLAUDE.md:     XX lines (OK / SPLIT RECOMMENDED)
  Git:           clean / X uncommitted files
```
