# Model Reference (current)

The lever that decides output quality is no longer the model alone. Frontier models converged, so the harness around the model - hooks, memory, orchestration, review loops, effort routing - now does most of the work. Pick the tier for the task, then spend the real budget on effort and context, not on chasing a bigger model.

Last verified: 2026-07. Verify against the live catalog before quoting - model strings and prices move.

## Current lineup

| Tier | Model string | Context | Max output | Input $/M | Output $/M | Reach for it when |
|------|--------------|---------|-----------|-----------|------------|-------------------|
| Most capable | `claude-fable-5` | 1M | 128K | 10 | 50 | Hardest long-horizon agentic runs, overnight builds, first-shot whole-system implementations |
| Flagship Opus | `claude-opus-4-8` | 1M | 128K | 5 | 25 | Architecture, refactors, deep debugging, multi-file reasoning - the default heavy tier |
| Flagship Sonnet | `claude-sonnet-5` | 1M | 128K | 3 | 15 | Most feature work and coding - near-Opus quality at Sonnet cost |
| Fast + cheap | `claude-haiku-4-5` | 200K | 64K | 1 | 5 | Lookups, file scans, log grep, grunt subagent work |

Previous-generation strings still active: `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`. Pin them only when you need time before upgrading.

## Effort is the primary lever, not thinking budgets

`budget_tokens` is retired on the current tiers. Control depth with `effort`: `low` | `medium` | `high` | `xhigh` | `max`.

- `low` - subagents, mechanical work, latency-sensitive lookups.
- `high` - the sweet spot for most intelligence-sensitive work; the default.
- `xhigh` - the best setting for coding and agentic work, and the default in Claude Code.
- `max` - reserve for the hardest, latency-insensitive problems; can overthink.

Adaptive thinking (`thinking: {type: "adaptive"}`) replaces fixed thinking budgets - the model decides how much to think per step. Combine adaptive thinking with an effort floor of `high` on agentic runs.

## Routing map

| Task class | Tier | Effort |
|------------|------|--------|
| Quick fix / lookup / log scan | Haiku 4.5 | low |
| Feature work / general coding | Sonnet 5 | high / xhigh |
| Refactor / architecture / hard debug | Opus 4.8 | xhigh |
| Long-horizon autonomous build | Fable 5 | high / xhigh |
| Grunt subagent (search, fetch, scan) | Haiku 4.5 | low |

Cost discipline that matters more than picking a cheaper model:
- Route grunt subagents to Haiku at `low` effort; keep the capable model on the reasoning.
- Give the full task spec up front in one well-specified turn - it cuts turn count and total cost on agentic work.
- Bound agentic loops with a task budget rather than a smaller model when you need a ceiling.

## Task budgets

For agentic loops, hand the model a token ceiling it can see and pace itself against, distinct from the hard per-response `max_tokens` cap. The model self-moderates and wraps up gracefully instead of being cut off. Use this to cap cumulative spend across a loop; use `effort` to set per-turn depth.
