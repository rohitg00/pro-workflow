---
name: cost-tracker
description: Track session costs, set budget alerts, and optimize token spend. Use to check costs mid-session or set spending limits.
---

# Cost Tracker

Monitor and optimize Claude Code session costs.

## Trigger

Use when:
- Checking session costs
- Setting budget alerts
- Optimizing token spend
- Planning multi-session work

## Cost Awareness

### Check Current Costs
```bash
# Session cost is shown at the end of each session
# Mid-session: check the status bar or run /cost
```

### Cost Drivers

| Operation | Relative Cost | Optimization |
|-----------|--------------|-------------|
| Large file reads | High | Use offset/limit params |
| Broad grep searches | Medium | Scope to specific dirs |
| Subagent spawning | High (new context) | Reuse agents via SendMessage |
| Repeated tool calls | Cumulative | Batch operations |
| MCP tool calls | Variable | Minimize round-trips |
| Model selection | 3-10x difference | Use haiku for simple tasks |

### Token Budget by Task Type

| Task | Typical Cost | Budget Alert |
|------|-------------|-------------|
| Bug fix | $0.10-0.50 | $1.00 |
| Feature (small) | $0.50-2.00 | $3.00 |
| Feature (large) | $2.00-8.00 | $10.00 |
| Refactor | $1.00-5.00 | $7.00 |
| Code review | $0.20-1.00 | $2.00 |

### Tool-Call Budgets

Set explicit budgets by task complexity:

| Task Type | Tool-Call Budget | Wrap-Up At |
|-----------|-----------------|------------|
| Quick fix / lookup | 20 calls | 15 |
| Bug fix | 30 calls | 25 |
| Feature (small) | 50 calls | 40 |
| Feature (large) | 80 calls | 65 |
| Refactor | 50 calls | 40 |

At the wrap-up threshold: commit progress, assess remaining work, decide whether to continue or start fresh.

### Optimization Strategies

1. **Scope prompts tightly** — "Fix the auth bug in src/auth/login.ts" vs "Fix the auth bug"
2. **Use the right model** — Haiku for simple lookups, Sonnet for features, Opus for architecture
3. **Delegate to subagents** — Search/explore operations in subagents keep main context lean
4. **Compact proactively** — Don't wait for auto-compact; compact at task boundaries
5. **Read selectively** — Use `offset` and `limit` params for large files
6. **Batch operations** — Multiple independent tool calls in one message
7. **One-pass discipline** — Write complete solution, test once, stop if green
8. **No re-reads** — Don't re-read unchanged files; trust cached knowledge
9. **Read before write** — Never write a file without reading it first
10. **Kill output bloat** — No sycophantic openers, no closing fluff, no prompt restatement

## Budget Alerts

Set mental checkpoints:
- **50% budget** — Are you on track? Should you compact?
- **80% budget** — Wrap up current task, avoid new exploration
- **100% budget** — Commit what you have, start fresh session

## Output

```text
COST TRACKER
  Session cost: $X.XX
  Token usage: [input]K in / [output]K out
  Cache hit rate: ~XX%

  Top cost drivers:
    1. [operation] — $X.XX
    2. [operation] — $X.XX

  Optimization tips:
    - [specific suggestion]
```

## Rules

- Track costs as awareness, not hard limits
- Never sacrifice code quality to save tokens
- Compact at task boundaries, not mid-task
- Use subagents for exploration-heavy work
