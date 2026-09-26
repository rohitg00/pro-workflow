# Settings Guide

Complete reference for configuring Claude Code. Settings control permissions, behavior, and integrations.

## Settings Hierarchy (Top Wins)

```text
1. CLI flags              --permission-mode, --max-budget-usd
2. .claude/settings.local.json   Project-local (gitignored)
3. .claude/settings.json         Project-shared (committed)
4. ~/.claude/settings.local.json  User-local (personal)
5. ~/.claude/settings.json        User-global
6. managed-settings.json          Enterprise policy (read-only)
```

First match wins. Project settings override user settings. CLI flags override everything.

## Permission Modes

| Mode | What runs without asking | Best for |
|------|--------------------------|----------|
| `default` (Manual) | Reads only. With the sandbox on and `sandbox.autoAllowBashIfSandboxed` true (the default), sandboxed Bash commands also run without a prompt | Reviewing every action yourself |
| `acceptEdits` | Reads, file edits, and common filesystem commands (`mkdir`, `mv`, `cp`, ...) in the working directory | Iterating on code you review |
| `plan` | Reads, plus classifier-approved commands when auto mode is available | Exploring before changing anything |
| `auto` | Everything, with a background classifier checking each action | Long tasks and loops, less prompt fatigue |
| `dontAsk` | Reads and pre-approved tools. Anything that would prompt is denied | Locked-down CI and scripts |
| `bypassPermissions` | Everything | Isolated containers and VMs only |

Set via CLI: `claude --permission-mode auto`. `manual` is an alias for `default`. `Shift+Tab` cycles `default` > `acceptEdits` > `plan`, with optional modes after `plan`.

`permissions.defaultMode` sets the starting mode. `auto` and `bypassPermissions` only take effect from `~/.claude/settings.json`, managed settings, or `--settings`, never from project or local settings.

`dontAsk` does not mean "approve everything". It denies every call that would otherwise prompt, so use it only where you pre-approved what the job needs.

## Permission Rules

Rules follow `Tool` or `Tool(specifier)` format. Precedence: deny > ask > allow. A matching ask rule prompts even when a more specific allow rule also matches.

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl * | bash)",
      "Edit(/vendor/**)"
    ],
    "ask": [
      "Bash(git push --force*)",
      "Bash(npm publish*)"
    ],
    "allow": [
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "WebFetch(domain:code.claude.com)",
      "mcp__github__get_*"
    ]
  }
}
```

### Wildcard Syntax

| Pattern | Matches |
|---------|---------|
| `Bash(npm run lint)` | Exactly that command |
| `Bash(git diff *)` | `git diff` with any arguments |
| `Edit(/src/**)` | Any file under src/ recursively |
| `WebFetch(domain:*.github.com)` | Any GitHub subdomain |
| `mcp__github` or `mcp__github__*` | Every tool from the `github` MCP server |
| `mcp__github__get_*` | Only its `get_` tools |
| `Agent(model:opus)` | Agent calls that request the Opus tier |

MCP rules use the `mcp__<server>__<tool>` name. Claude Code skips `mcp__` rules that contain parentheses. Allow globs must start with a literal `mcp__<server>__` prefix; `"mcp__*"` in allow is skipped.

Deny and ask rules apply to every subcommand of a compound command, including commands inside `$(...)`, subshells, and loops. `Bash(git clean *)` still prompts for `cd /tmp && git clean -f`.

## Auto Mode

Auto mode sends each action that no rule resolves to a classifier. The classifier sees your messages, tool calls, and CLAUDE.md, but not tool results. It blocks what looks destructive or outside what you asked for, and Claude tries another approach.

### Decision order

1. Your deny, ask, and allow rules resolve first. Content-scoped ask rules such as `Bash(git push *)` always prompt, even in auto mode.
2. Reads and file edits in the working directory are auto-approved. Writes to protected paths (`.git`, `.claude`, `.vscode`, shell dotfiles, and similar) and the first read outside the working directories do not.
3. Everything else goes to the classifier.

A PreToolUse hook that returns `"allow"` cannot override a matching ask or deny rule. A PermissionRequest hook can answer the prompt on your behalf, but then nobody reviews the call, so removing the ask rule is the clearer fix.

### Allow rules auto mode drops

On entering auto mode Claude Code suspends allow rules that grant arbitrary code execution, and restores them when you leave:

- Blanket `Bash(*)` or `PowerShell(*)`
- Wildcarded interpreters such as `Bash(python*)` or `Bash(node *)`
- Package-manager run commands
- `Agent` allow rules
- `Monitor` allow rules

Narrow rules such as `Bash(npm test)` stay in effect. Set `autoMode.classifyAllShell: true` to send every shell command to the classifier instead.

### Fallback to prompts

If the classifier blocks 3 actions in a row or 20 in a session, auto mode pauses and every action prompts again. Approving the prompted action resumes auto mode. The thresholds are not configurable. An allowed action resets the consecutive counter; the session counter resets only when it triggers.

A denial with no verdict (the classifier model was unavailable, or a separate safety check refused the classifier request) does not count toward either threshold. In a `-p` run with no prompt tool, a blocked action is skipped and Claude keeps working.

Two things push a session into fallback without adding any safety:

- Hooks that exit 2 on false positives. A PreToolUse hook that blocks a harmless command wastes one of your 3 consecutive blocks.
- Missing `autoMode.environment` context. If the classifier does not know your repos, registries, and local services are trusted, it blocks routine work.

### The `autoMode` block

The classifier reads `autoMode` only from `~/.claude/settings.json`, managed settings, and `--settings`. It ignores `autoMode` in `.claude/settings.json` and `.claude/settings.local.json`.

```json
{
  "autoMode": {
    "environment": [
      "$defaults",
      "Source control: every repository under github.com/your-org is trusted; feature-branch pushes are routine.",
      "Local services: dev servers on localhost ports are disposable development infrastructure."
    ],
    "allow": [
      "$defaults",
      "Running the project's test, lint, and build scripts is routine."
    ],
    "soft_deny": [
      "$defaults",
      "Merging a pull request needs the user to approve that specific merge in this session."
    ],
    "hard_deny": ["$defaults"]
  }
}
```

- `environment` describes trusted infrastructure: repos, registries, domains, local services.
- `allow` lists exceptions to soft blocks for routine patterns.
- `soft_deny` blocks destructive actions that the user's explicit intent in the session can clear.
- `hard_deny` blocks unconditionally.

Always keep `"$defaults"` in each list unless you mean to replace the built-in rules for that section.

Useful commands:

```bash
claude auto-mode defaults      # print the built-in rules
claude auto-mode config        # print your effective rules
claude auto-mode critique      # review your custom rules for ambiguity
```

Inside a session, `/auto-mode-setup` drafts `environment` entries from your project and recent sessions, and `/permissions` has a **Recently denied** tab where `r` retries a denied action.

### Prefer autoMode over ask rules

If you want to approve something yourself every time, an ask rule is right. For everything else, describe it to the classifier:

| You want | Use |
|----------|-----|
| A human prompt every time (publish, force push, merge) | `permissions.ask` |
| Routine work in your own repos and registries to run | `autoMode.environment` |
| A pattern the classifier keeps blocking to run | `autoMode.allow` |
| Outward actions only when you asked for them | `autoMode.soft_deny` |
| Something never to happen | `permissions.deny` or `autoMode.hard_deny` |

A large ask list turns auto mode back into manual mode for every command it matches.

## Key Settings

### Behavior

```json
{
  "outputStyle": "Explanatory",
  "fastMode": false,
  "prefersReducedMotion": false,
  "fileSuggestion": true
}
```

Output styles: `"Concise"`, `"Explanatory"`, `"Learning"`, `"Custom:<instructions>"`

### Context & Compaction

```json
{
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "80"
  }
}
```

Default auto-compact triggers at ~95%. Set lower for proactive compaction. `50` is good for long sessions.

### Plans Directory

```json
{
  "plansDirectory": ".claude/plans"
}
```

Stores plan mode artifacts for team sharing and review.

### Status Line

```json
{
  "statusLine": "model branch tokens"
}
```

Shows model, git branch, and token usage in the status bar. Customize via `/statusline`.

### Spinner Customization

```json
{
  "spinnerVerbs": ["Thinking", "Analyzing", "Crafting", "Brewing"],
  "spinnerTipsOverride": [
    "Tip: Use /compact at task boundaries",
    "Tip: Plan mode for >3 files",
    "Tip: Ctrl+B sends tasks to background"
  ]
}
```

### Attribution

```json
{
  "attribution": {
    "commitMessage": "",
    "prDescription": ""
  }
}
```

Set to empty strings to disable "Co-Authored-By" and PR footers.

### Sandbox

The sandbox runs Bash commands under OS isolation (Seatbelt on macOS, bubblewrap on Linux).

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "allowUnsandboxedCommands": true,
    "excludedCommands": ["docker *", "gh *"],
    "filesystem": {
      "allowWrite": ["/tmp", "~/.npm", "~/.cache"]
    },
    "network": {
      "allowedDomains": ["github.com", "api.github.com", "registry.npmjs.org"],
      "allowLocalBinding": true
    },
    "credentials": {
      "files": [
        { "path": "~/.ssh", "mode": "deny" },
        { "path": "~/.aws", "mode": "deny" }
      ]
    }
  }
}
```

- `autoAllowBashIfSandboxed` (default `true`) runs sandboxed commands without a prompt. Content-scoped ask rules and deny rules still apply.
- `allowUnsandboxedCommands` lets Claude retry a failed command outside the sandbox. Every retry goes through the permission check. Set it to `false` for strict mode.
- `excludedCommands` takes a call out of the sandbox only when its entries cover every command in the call. `gh *` alone does not cover `cd repo && gh pr view` or `gh pr list | head`. Write excluded tools as standalone calls.
- Go-based CLIs such as `gh` and `terraform` can fail TLS verification under Seatbelt on macOS. Add them to `excludedCommands`. `docker` does not work in the sandbox at all.

### MCP Server Approval

```json
{
  "enableAllProjectMcpServers": false,
  "enabledMcpjsonServers": ["context7", "playwright"],
  "disabledMcpjsonServers": ["unused-server"]
}
```

### Budget Control

Via CLI flags (not settings.json):
```bash
claude --max-budget-usd 5.00
claude --max-turns 50
```

## Reading Denials From Transcripts

Each session transcript in `~/.claude/projects/<project>/<session>.jsonl` marks a refused tool call with a `toolDenialKind` field. These values were observed in transcripts and are not documented, so treat them as subject to change:

| `toolDenialKind` | Meaning | Fix |
|------------------|---------|-----|
| `permission-rule` | A deny rule or a hook exit 2 blocked it | Check for hook false positives first |
| `automode-blocked` | The classifier judged it unsafe | Add `autoMode.environment` or `allow` entries |
| `automode-parsing-error` | No verdict: a separate safety check refused the classifier request | Nothing to tune; retry later |
| `automode-unavailable` | No verdict: the classifier model was overloaded or timed out | Transient; retry |
| `user-rejected` | You answered no at a prompt | Remove the ask rule if you always answer yes |

Count them per session:

```bash
grep -ho '"toolDenialKind":"[^"]*"' ~/.claude/projects/*/*.jsonl | sort | uniq -c | sort -rn
```

A `PermissionDenied` hook receives the exact `tool_input` of each auto mode denial if you want your own log.

## Production-Ready Example

See `settings.example.json` in the repo root for a full working configuration. Put its `autoMode` block in `~/.claude/settings.json`, because the classifier ignores `autoMode` in project settings.

## Scope: What Lives Where

| Feature | Global Only | Dual Scope |
|---------|:-----------:|:----------:|
| Tasks & Task Lists | Y | |
| Agent Teams | Y | |
| Auto Memory | Y | |
| Credentials/Auth | Y | |
| Keybindings | Y | |
| MCP User Servers | Y | |
| `autoMode` classifier config | Y | |
| CLAUDE.md | | Y |
| Settings | | Y |
| Agents | | Y |
| Commands | | Y |
| Skills | | Y |
| Hooks | | Y |
| MCP Project Servers | | Y |
| Rules | | Y |

Global = `~/.claude/`, Project = `.claude/`

## Environment Variables

Key env vars (set in settings or shell):

| Variable | Purpose |
|----------|---------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Trigger compaction earlier (default ~95) |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams |
| `CLAUDE_CODE_TMPDIR` | Custom temp directory |
| `DISABLE_AUTOUPDATER` | Prevent auto-updates |
| `CLAUDE_CODE_SIMPLE` | Simplified output mode |

## Sources

- https://code.claude.com/docs/en/permission-modes
- https://code.claude.com/docs/en/auto-mode-config
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/sandboxing
- https://code.claude.com/docs/en/settings-reference

## Cross-Agent Note

Cursor uses `.cursor/rules/` and `.cursorrules` for similar configuration. See `references/cross-agent-workflows.md` for mapping between Claude Code settings and Cursor rules.
