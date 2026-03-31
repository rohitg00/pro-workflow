---
name: file-watcher
description: Configure file watching hooks to auto-react to config changes, env file updates, and dependency modifications. Use to set up reactive workflows.
---

# File Watcher

Use Claude Code's `FileChanged` and `CwdChanged` hooks to create reactive workflows that respond to file system changes.

## Trigger

Use when:
- Setting up auto-reload for config changes
- Watching for dependency updates
- Monitoring build output
- Creating reactive development workflows

## How File Watching Works

Claude Code's `SessionStart` and `CwdChanged` hooks can return `watchPaths` to register file watchers:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "watchPaths": [
      "/absolute/path/to/.env",
      "/absolute/path/to/package.json"
    ]
  }
}
```

When watched files change, the `FileChanged` hook fires with:
```json
{
  "hook_event_name": "FileChanged",
  "file_path": "/path/to/changed/file",
  "event": "change"
}
```

## Environment Injection

`CwdChanged` and `FileChanged` hooks can write to `CLAUDE_ENV_FILE` to inject environment variables into subsequent Bash commands:

```bash
echo "export PROJECT_TYPE=node" >> "$CLAUDE_ENV_FILE"
echo "export TEST_CMD='npm test'" >> "$CLAUDE_ENV_FILE"
```

## Common Watch Patterns

### Watch .env for Changes
```javascript
const envFile = path.join(projectRoot, '.env');
if (fs.existsSync(envFile)) {
  output.hookSpecificOutput = {
    hookEventName: 'SessionStart',
    watchPaths: [envFile]
  };
}
```

### Watch package.json for Dependency Changes
Detect when dependencies change and remind to run `npm install`.

### Watch tsconfig.json for Config Changes
Remind to restart TypeScript checks when config changes.

## Setup

Add to hooks.json:
```json
{
  "FileChanged": [{
    "matcher": ".env|package.json|tsconfig.json",
    "hooks": [{
      "type": "command",
      "command": "node scripts/file-changed.js"
    }]
  }]
}
```

## Rules

- Use absolute paths for watchPaths (required by Claude Code)
- Matcher uses pipe-separated filenames
- Watcher uses 500ms stability threshold and 200ms poll interval
- Keep file-changed handlers fast (<5s) to avoid blocking
- Use `CLAUDE_ENV_FILE` for injecting env vars, not direct export
