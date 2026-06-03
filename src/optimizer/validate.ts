import type { ValidationItem, ValidationOutcome, ValidationResult } from './types';
import { callLLM, type Provider } from './llm';
import { stripFencesAndParse } from './parse';

export interface ValidateArgs {
  skill: string;
  items: ValidationItem[];
  provider: Provider;
  model: string;
}

export interface ValidateLLMRunResult {
  result: ValidationResult;
  costUsd: number;
}

export async function validateSkill({ skill, items, provider, model }: ValidateArgs): Promise<ValidateLLMRunResult> {
  if (items.length === 0) {
    return { result: { total: 0, passed: 0, weightedScore: 0, outcomes: [] }, costUsd: 0 };
  }

  const system = SYSTEM_PROMPT;
  const user = JSON.stringify({
    candidate_skill: skill,
    validation_items: items.map((i) => ({ id: i.id, prompt: i.prompt, expected: i.expected, weight: i.weight })),
  });

  const res = await callLLM({ provider, model, system, user, maxTokens: 4096, temperature: 0 });
  const outcomes = parseOutcomes(res.text);
  const passedItems = outcomes.filter((o) => o.pass);
  const passedWeight = passedItems.reduce((acc, o) => acc + (items.find((i) => i.id === o.itemId)?.weight ?? 0), 0);
  const totalWeight = items.reduce((acc, i) => acc + i.weight, 0);
  const weightedScore = totalWeight === 0 ? 0 : passedWeight / totalWeight;

  return {
    result: { total: items.length, passed: passedItems.length, weightedScore, outcomes },
    costUsd: res.costUsd,
  };
}

const SYSTEM_PROMPT = `You are an evaluation gate. For each validation item, decide whether the candidate skill content would lead an agent to satisfy the expected behavior on the prompt.

Output STRICT JSON only, no prose, no markdown fences. Schema:
{
  "outcomes": [
    { "item_id": <int>, "pass": <bool>, "score": <float 0..1>, "rationale": "<one sentence>" }
  ]
}

Rules:
- pass=true only if a competent agent following the skill content would produce the expected behavior on the prompt.
- score is your continuous confidence: 1.0 = perfect, 0.0 = clearly violates.
- Be strict: borderline cases score below 0.6 and pass=false.`;

function parseOutcomes(text: string): ValidationOutcome[] {
  const root = stripFencesAndParse<{ outcomes?: unknown }>(text);
  if (!root || !Array.isArray(root.outcomes)) return [];
  const out: ValidationOutcome[] = [];
  for (const raw of root.outcomes) {
    const o = raw as Record<string, unknown>;
    if (typeof o.item_id !== 'number' || typeof o.pass !== 'boolean') continue;
    out.push({
      itemId: o.item_id,
      pass: o.pass,
      score: typeof o.score === 'number' ? o.score : o.pass ? 1 : 0,
      rationale: typeof o.rationale === 'string' ? o.rationale : '',
    });
  }
  return out;
}

export const __test = { parseOutcomes };
