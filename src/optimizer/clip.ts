import type { Patch, LRBudget } from './types';

export interface ClipResult {
  selected: Patch[];
  clipped: Patch[];
}

export function clipByLR(patches: Patch[], budget: LRBudget): ClipResult {
  const buckets: Record<Patch['op'], Patch[]> = { add: [], delete: [], replace: [] };
  for (const p of patches) buckets[p.op].push(p);

  const selected: Patch[] = [];
  const clipped: Patch[] = [];

  function take(op: Patch['op'], limit: number) {
    selected.push(...buckets[op].slice(0, limit));
    clipped.push(...buckets[op].slice(limit));
  }

  take('delete', budget.maxDeletes);
  take('replace', budget.maxReplaces);
  take('add', budget.maxAdds);

  return { selected, clipped };
}
