---
name: context-optimizer
description: Optimize token usage and context management. Use when sessions feel slow, context is degraded, or you're running out of budget.
user-invocable: true
---

# Context Optimizer

Manage your context window and token budget effectively.

## Quick Diagnosis

1. Run `/context` to check current usage
2. If > 70% → compact now before it degrades
3. If > 90% → you're in the "dumb zone", compact immediately

## Optimization Strategies

### Immediate

| Action | Saves | When |
|--------|-------|------|
| `/compact` | 30-50% context | At task boundaries |
| Disable unused MCPs | ~5% per MCP | When switching domains |
| Use subagents for exploration | Keeps main context clean | Heavy search/read tasks |
| Fresh session via `/clear` | 100% reset | When starting unrelated work |

### Configuration

Set proactive auto-compaction:
```json
{
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50"
  }
}
```

### MCP Audit

Keep <10 MCPs enabled, <80 tools total. Each MCP adds overhead to every request.

```bash
/mcp          # List active servers
# Disable what you're not using
```

### Prompt Engineering for Token Efficiency

- Scope your prompts: "In src/auth/, fix the login bug"
- Provide constraints: "Don't modify the middleware"
- Give acceptance criteria: "Should return 429 after 5 attempts"
- Avoid vague prompts: "Fix the code" (forces Claude to read everything)

### Subagent Delegation

Heavy operations that generate lots of output should go to subagents:

- Test suite output → subagent
- Large file exploration → subagent
- Documentation generation → subagent
- Log analysis → subagent

The main session stays clean while subagents handle the volume.

## Context Budget Planning

Per-phase context targets live in `context-engineering` (Context Budget Planning).

## Token Efficiency

### Output Reduction (40-60% savings)
- Lead with the answer; skip preamble, prompt restatement, and sign-offs
- Code first, explanation only if non-obvious
- Structured output (tables, bullets) over prose
- ASCII only: -- not em dashes, straight quotes not smart quotes

### Behavioral Efficiency
- One-pass coding: complete solution, test once, stop if green
- Read before write: never modify unread files
- No re-reads: don't re-read unchanged files
- If the same fix fails twice, rethink the approach

### Task Profiles
Switch response style based on context:
- **Coding**: code first, minimal explanation, simplest solution
- **Agent/Pipeline**: structured output only, no prose, parseable
- **Analysis**: finding first, tables over paragraphs, sourced numbers

## CLAUDE.md Optimization

- Root CLAUDE.md: < 60 lines ideal, < 150 max
- Move package-specific info to package-level CLAUDE.md
- Move personal preferences to CLAUDE.local.md
- Remove obvious or rapidly-changing information

## When Context Is Degraded

Signs:
- Claude repeats itself or forgets earlier context
- Responses become generic or lose project-specific knowledge
- Tool calls start failing for reasons that worked earlier

Fix:
1. Manual `/compact`
2. If still bad: fresh context with `/clear` (or a new session)
3. For recurring issues: reduce CLAUDE.md size, disable MCPs
