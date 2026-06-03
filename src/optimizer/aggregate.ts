import type { Patch } from './types';

export interface AggregateResult {
  merged: Patch[];
  duplicates: number;
  conflicts: number;
}

export function aggregatePatches(batches: Patch[][]): AggregateResult {
  const seen = new Map<string, { patch: Patch; votes: number }>();
  let conflicts = 0;

  for (const batch of batches) {
    for (const patch of batch) {
      const key = patchKey(patch);
      const prior = seen.get(key);
      if (!prior) {
        seen.set(key, { patch, votes: 1 });
        continue;
      }
      if (prior.patch.op === patch.op && prior.patch.payload === patch.payload) {
        prior.votes++;
      } else {
        conflicts++;
        if (prior.votes < 2) seen.set(key, { patch, votes: 1 });
      }
    }
  }

  const ordered = [...seen.values()].sort((a, b) => {
    if (a.patch.op !== b.patch.op) return opRank(a.patch.op) - opRank(b.patch.op);
    return b.votes - a.votes;
  });

  const duplicates = ordered.reduce((acc, e) => acc + Math.max(0, e.votes - 1), 0);
  return { merged: ordered.map((e) => e.patch), duplicates, conflicts };
}

function patchKey(p: Patch): string {
  return `${p.op}::${p.anchor.trim().toLowerCase()}`;
}

function opRank(op: Patch['op']): number {
  if (op === 'delete') return 0;
  if (op === 'replace') return 1;
  return 2;
}
