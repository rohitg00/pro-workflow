import type { LRBudget, Patch, ReflectInput, ReflectOutput, Rejection, Trajectory } from './types';
import { callLLM, type Provider } from './llm';
import { stripFencesAndParse } from './parse';

export interface ReflectArgs {
  input: ReflectInput;
  provider: Provider;
  model: string;
}

export async function reflect({ input, provider, model }: ReflectArgs): Promise<ReflectOutput> {
  const system = SYSTEM_PROMPT;
  const user = buildUserPrompt(input);
  const res = await callLLM({
    provider,
    model,
    system,
    user,
    maxTokens: 4096,
    temperature: 0.2,
  });
  const patches = parsePatches(res.text);
  return { patches, reasoning: extractReasoning(res.text), costUsd: res.costUsd };
}

const SYSTEM_PROMPT = `You are a SkillOpt optimizer. Given the current skill markdown, recent correction trajectories, and a list of previously rejected patches, propose bounded edits to the skill document.

Output STRICT JSON only, no prose, no markdown fences. Schema:
{
  "reasoning": "<one short paragraph explaining the edit theme>",
  "patches": [
    { "op": "add" | "delete" | "replace", "anchor": "<exact substring from current skill, or empty string for append-at-end add>", "payload": "<new text for add/replace; empty for delete>" }
  ]
}

Constraints:
- Each patch operates on a unique anchor string.
- "anchor" MUST be a verbatim substring of the current skill (or empty for append).
- Do not propose patches that match any entry in the rejected_history.
- Respect the LR budget: at most N adds, N deletes, N replaces.
- Patches must address concrete correction patterns from the trajectories, not vague style.`;

function buildUserPrompt(input: ReflectInput): string {
  return JSON.stringify({
    current_skill: input.currentSkill,
    trajectories: input.trajectories.map(formatTrajectory),
    rejected_history: input.rejectedHistory.map(formatRejection),
    lr_budget: input.lrBudget,
  });
}

function formatTrajectory(t: Trajectory): Record<string, unknown> {
  return {
    category: t.category,
    rule: t.rule,
    mistake: t.mistake,
    correction: t.correction,
    times_applied: t.timesApplied,
  };
}

function formatRejection(r: Rejection): Record<string, unknown> {
  return {
    patches: r.patches,
    reason: r.reason,
    delta_score: r.deltaScore,
  };
}

function parsePatches(text: string): Patch[] {
  const root = stripFencesAndParse<{ patches?: unknown }>(text);
  if (!root || !Array.isArray(root.patches)) return [];
  const out: Patch[] = [];
  for (const raw of root.patches) {
    const p = raw as Record<string, unknown>;
    if (typeof p.op !== 'string' || typeof p.anchor !== 'string' || typeof p.payload !== 'string') continue;
    if (p.op !== 'add' && p.op !== 'delete' && p.op !== 'replace') continue;
    out.push({ op: p.op, anchor: p.anchor, payload: p.payload });
  }
  return out;
}

function extractReasoning(text: string): string {
  const root = stripFencesAndParse<{ reasoning?: string }>(text);
  return root?.reasoning ?? '';
}

export const __test = { parsePatches, extractReasoning };
