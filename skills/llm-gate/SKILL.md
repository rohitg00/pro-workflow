---
name: llm-gate
description: LLM-powered quality verification using prompt hooks. Validates commit messages, code patterns, and conventions using AI before allowing operations. Use to set up intelligent guardrails.
---

# LLM Gate

Use Claude Code's `type: "prompt"` hooks to create intelligent quality gates that use AI to verify operations.

## Trigger

Use when:
- Setting up commit message validation
- Enforcing code conventions beyond what linters catch
- Creating smart guardrails for specific operations

## How Prompt Hooks Work

Claude Code supports hooks with `type: "prompt"` that run a small LLM (Haiku by default) to verify conditions:

```json
{
  "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "prompt",
      "if": "Bash(git commit*)",
      "prompt": "Check if this git commit follows conventional commit format (<type>(<scope>): <summary>). The commit command is: $ARGUMENTS. Return {\"ok\": true} if valid, {\"ok\": false, \"reason\": \"...\"} if not.",
      "model": "haiku",
      "timeout": 15
    }]
  }]
}
```

The hook:
1. Substitutes `$ARGUMENTS` with the JSON hook input
2. Sends to Haiku (fast, cheap)
3. Expects `{"ok": true}` or `{"ok": false, "reason": "..."}`
4. If not ok → blocks the tool call with the reason

## Example Gates

### Conventional Commit Validator
```json
{
  "type": "prompt",
  "if": "Bash(git commit*)",
  "prompt": "Verify this git commit follows conventional commits: type(scope): summary. Types: feat,fix,refactor,test,docs,chore,perf,ci. Summary under 72 chars. Input: $ARGUMENTS",
  "model": "haiku"
}
```

### Destructive Command Guard
```json
{
  "type": "prompt",
  "if": "Bash(rm *)",
  "prompt": "Check if this rm command is safe. Flag if it uses -rf on important directories (src/, node_modules/, .git/). Input: $ARGUMENTS",
  "model": "haiku"
}
```

### API Key Leak Prevention
```json
{
  "type": "prompt",
  "matcher": "Write",
  "prompt": "Check if this file write contains hardcoded API keys, secrets, passwords, or tokens. Input: $ARGUMENTS. Return ok:false if secrets found.",
  "model": "haiku"
}
```

## Agent Hooks

For complex verification, use `type: "agent"` (runs a full agent):

```json
{
  "type": "agent",
  "if": "Bash(git push*)",
  "prompt": "Review all staged changes for security issues before pushing. Check for: hardcoded secrets, SQL injection, XSS vulnerabilities, exposed internal URLs.",
  "model": "haiku",
  "timeout": 60
}
```

## Setup Guide

1. Choose which operations to gate
2. Write the prompt (keep it focused, under 100 words)
3. Pick the model (haiku for speed, sonnet for accuracy)
4. Set timeout (15s for prompts, 60s for agents)
5. Add to hooks.json under the appropriate event

## Rules

- Use Haiku for simple checks (fast, cheap)
- Use Sonnet only for complex analysis
- Keep prompts under 100 words for reliability
- Always include `if` condition to avoid running on every tool call
- Set reasonable timeouts (15s prompt, 60s agent)
- Test hooks before deploying to avoid blocking workflows
