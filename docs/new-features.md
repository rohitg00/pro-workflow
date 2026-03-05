# New Claude Code Features (2026)

Latest capabilities and how to use them with pro-workflow.

## Voice Mode

Talk to Claude Code instead of typing. Rolling out to Pro, Max, Team, and Enterprise plans.

### Setup

```
/voice    # Toggle voice mode on/off
```

### Usage

- Hold **spacebar** to talk, release to transcribe
- Mix typed and spoken input in a single prompt
- Works alongside all other features (hooks still fire, modes still apply)

### When Voice Helps

| Scenario | Why Voice |
|----------|----------|
| Describing architecture | Faster than typing long descriptions |
| Quick fixes | "Fix the import on line 42" |
| Exploring ideas | Stream-of-consciousness brainstorming |
| Reviewing code | "Walk me through this function" |

### Pro-Workflow Integration

Voice mode works with all pro-workflow patterns. Corrections spoken verbally still trigger the self-correction loop if you say "remember that" or "add to rules".

## Agent Teams

Coordinate multiple Claude Code sessions working as a team.

### Enable

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### How It Works

1. One session is the **lead** — coordinates work, assigns tasks
2. **Teammates** work independently in their own context windows
3. Teammates message each other directly (not just report to lead)
4. Shared task list with dependency tracking

### Display Modes

| Mode | How | Best For |
|------|-----|----------|
| In-process | `Shift+Down` to navigate | Quick coordination |
| Split panes | tmux or iTerm2 splits | Visual monitoring |

### Delegate Mode

Press `Shift+Tab` to toggle delegate mode. Lead orchestrates only, no direct code edits.

### Team Patterns

| Pattern | Lead | Teammate A | Teammate B |
|---------|------|-----------|-----------|
| Frontend/Backend | Coordinate | UI changes | API changes |
| Feature/Tests | Plan | Implementation | Test coverage |
| Competing hypotheses | Evaluate | Approach A | Approach B |
| Cross-layer | Integrate | Database | Application |

### Docs

https://code.claude.com/docs/agent-teams

## Checkpointing & Rewind

Claude Code automatically tracks checkpoints during your session.

### Usage

- **`Esc Esc`** — Rewind to the last checkpoint
- **`/rewind`** — Browse and select a checkpoint to restore
- Checkpoints are git-based — your code state is saved at each point

### When to Rewind

- Claude went down the wrong path
- An approach isn't working out
- You want to try a different solution
- Something broke that was previously working

### Pro-Workflow Integration

The `PreCompact` hook saves context state, which complements checkpointing. Between checkpoints (code state) and pre-compact saves (context state), you can recover from most mistakes.

## Remote Control

Continue sessions from phone, tablet, or browser.

### How It Works

- Start Claude Code on your machine
- Access it remotely via `--remote` flag
- Continue interacting from any device
- Session state persists

### Headless Mode

Run Claude Code without a terminal UI for CI/CD and automation:

```bash
claude --print "review and fix lint errors" --max-turns 10
```

## New Hook Events

Claude Code has expanded from 8 to 18+ hook event types.

### Newly Available

| Event | When | Use Case |
|-------|------|----------|
| `SubagentStart` | Subagent spawns | Log agent activity, set up context |
| `SubagentStop` | Subagent finishes | Collect results, update metrics |
| `Setup` | Initial setup (30s timeout) | One-time initialization |
| `PermissionRequest` | Permission dialog | Auto-allow/deny, logging |
| `TeammateIdle` | Team member goes idle | Force continuation, reassign |
| `TaskCompleted` | Task marked complete | Quality gate on completion |
| `ConfigChange` | Settings modified | Detect mid-session changes |
| `WorktreeCreate` | Worktree created | Set up worktree-specific config |
| `WorktreeRemove` | Worktree removed | Cleanup |
| `PostToolUseFailure` | Tool use fails | Error tracking, retry logic |

### Hook Types

| Type | How It Works |
|------|-------------|
| `command` | Run shell script, receive JSON on stdin |
| `prompt` | Single-turn model evaluation (Haiku default) |
| `agent` | Multi-turn subagent with Read/Grep/Glob (up to 50 turns) |

### Agent Hooks Example

```json
{
  "PostToolUse": [{
    "matcher": "tool == 'Edit'",
    "hooks": [{
      "type": "agent",
      "agent": "reviewer",
      "prompt": "Review this edit for security issues",
      "timeout": 30000
    }]
  }]
}
```

### Prompt Hooks Example

```json
{
  "PreToolUse": [{
    "matcher": "tool == 'Bash' && tool_input.command matches 'rm'",
    "hooks": [{
      "type": "prompt",
      "prompt": "Is this rm command safe? Check for wildcards and critical paths.",
      "model": "haiku"
    }]
  }]
}
```

## Extra Usage & Billing

### Check Your Usage

| Command | Shows |
|---------|-------|
| `/usage` | Plan limits and remaining |
| `/extra-usage` | Pay-as-you-go overflow ($2,000/day cap) |
| `/cost` | Current session cost (API key users) |

### Fast Mode Billing

Fast mode is always billed to extra usage from the first token, even if you have remaining plan usage. Toggle with `/fast`.

### Budget Control

```bash
claude --max-budget-usd 5.00    # Cap at $5
claude --max-turns 50           # Limit turns
```
