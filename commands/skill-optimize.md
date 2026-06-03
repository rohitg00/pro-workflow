---
description: Train a skill's SKILL.md by running a SkillOpt-flavored offline loop over accumulated learn-rule corrections
---

# /skill-optimize - SkillOpt-flavored offline training

Run an offline, budget-capped optimization loop over a skill's accumulated `learn-rule` trajectories. Proposes bounded patches via an optimizer LLM, validates each candidate against a held-out portion of the same trajectories, and overwrites SKILL.md only when the candidate strictly improves the weighted score.

## Quick Start

```
/skill-optimize <slug> [--epochs 3] [--budget-usd 0.50]
```

## What it does

1. Pulls recent `learnings` rows scoped to the skill slug (or global)
2. Splits them into train + validation (~25% holdout, freezes validation set)
3. Runs `epochs` x `minibatches` rounds of: reflect → aggregate → clip → apply → evaluate → gate
4. Stops on: budget exhausted, kill switch (`~/.pro-workflow/STOP`), no improvement, or epochs done
5. If any candidate beat the baseline, overwrites SKILL.md and stamps the new hash

## Requirements

- 8 or more existing `learnings` rows for the slug
- `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY` / `OPENROUTER_API_KEY` / `FIREWORKS_API_KEY` with matching `--optimizer-provider`)
- `npm run build` has been run in the pro-workflow plugin directory at least once

## Examples

```
/skill-optimize pro-workflow
/skill-optimize wiki-research-loop --budget-usd 1.0 --epochs 5
/skill-optimize wrap-up --optimizer-model claude-opus-4-7 --evaluator-model gpt-4o-mini --json
```

See [skills/skill-optimizer/SKILL.md](../skills/skill-optimizer/SKILL.md) for full mechanics, defaults, and the SkillOpt provenance.
