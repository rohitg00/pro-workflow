import type { Trajectory } from './types';
import { callLLM, type Provider } from './llm';
import { stripFencesAndParse } from './parse';

export interface SlowUpdateArgs {
  bestSkill: string;
  recentlyAcceptedDiffs: string[];
  acceptedTrajectories: Trajectory[];
  provider: Provider;
  model: string;
}

export interface SlowUpdateResult {
  skill: string;
  costUsd: number;
  reasoning: string;
  changed: boolean;
}

export async function runSlowUpdate({
  bestSkill,
  recentlyAcceptedDiffs,
  acceptedTrajectories,
  provider,
  model,
}: SlowUpdateArgs): Promise<SlowUpdateResult> {
  const system = `You are a SkillOpt slow-update consolidator. Given the current best skill, a list of recently accepted edits, and the trajectories that justified them, produce a single coherent rewrite of the skill that preserves all accepted intent but removes redundancy, normalizes structure, and tightens phrasing.

Output STRICT JSON only:
{
  "reasoning": "<one paragraph explaining the consolidation>",
  "skill": "<full rewritten markdown>"
}

Rules:
- No new behavior that isn't implied by accepted edits.
- Preserve all section headings that existed in the best skill.
- Total length <= 2,000 tokens.`;

  const user = JSON.stringify({
    best_skill: bestSkill,
    accepted_diffs: recentlyAcceptedDiffs,
    accepted_trajectories: acceptedTrajectories.map((t) => ({
      category: t.category,
      rule: t.rule,
      correction: t.correction,
    })),
  });

  const res = await callLLM({ provider, model, system, user, maxTokens: 8192, temperature: 0.2 });
  const parsed = parse(res.text);
  return {
    skill: parsed.skill ?? bestSkill,
    reasoning: parsed.reasoning ?? '',
    changed: (parsed.skill ?? bestSkill) !== bestSkill,
    costUsd: res.costUsd,
  };
}

function parse(text: string): { skill?: string; reasoning?: string } {
  return stripFencesAndParse<{ skill?: string; reasoning?: string }>(text) ?? {};
}
