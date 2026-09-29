---
description: Train a skill's SKILL.md by running a SkillOpt-flavored offline loop over accumulated learn-rule corrections
---

# /skill-optimize - SkillOpt-flavored offline training

Run an offline, budget-capped optimization loop over a skill's accumulated `learn-rule` trajectories. Proposes bounded patches via an optimizer LLM, validates each candidate against a held-out portion of the same trajectories, and overwrites SKILL.md only when the candidate strictly improves the weighted score.

## Quick Start

```text
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
- A key configured for the selected provider in the plugin configuration dialog, or a corresponding `PRO_WORKFLOW_*_API_KEY` variable for standalone CLI use
- `npm run build` has been run in the pro-workflow plugin directory at least once

In a plugin session, invoke `run_provider_task` on the `providers` MCP server with `task: "optimizer"` and the requested runner arguments. See [provider configuration](../references/provider-configuration.md).

## Examples

```text
/skill-optimize pro-workflow
/skill-optimize wiki-research-loop --budget-usd 1.0 --epochs 5
/skill-optimize wrap-up --optimizer-model claude-opus-5-5 --evaluator-model gpt-4o-mini
```

The third example mixes providers. The CLI infers the provider from the model id (`claude-*` → anthropic, `gpt-*` / `o*` → openai), so you do not need `--evaluator-provider openai` for `gpt-4o-mini`. Pass an explicit `--optimizer-provider` / `--evaluator-provider` to override inference.

See [skills/skill-optimizer/SKILL.md](../skills/skill-optimizer/SKILL.md) for full mechanics, defaults, and the SkillOpt provenance.
