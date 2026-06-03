import type { Patch } from './types';

export interface ApplyResult {
  content: string;
  applied: Patch[];
  skipped: Array<{ patch: Patch; reason: string }>;
}

export function applyPatches(skill: string, patches: Patch[]): ApplyResult {
  let content = skill;
  const applied: Patch[] = [];
  const skipped: Array<{ patch: Patch; reason: string }> = [];

  for (const patch of patches) {
    const next = applyOne(content, patch);
    if (next.ok) {
      content = next.content;
      applied.push(patch);
    } else {
      skipped.push({ patch, reason: next.reason });
    }
  }

  return { content, applied, skipped };
}

function applyOne(skill: string, patch: Patch): { ok: true; content: string } | { ok: false; reason: string } {
  if (patch.op === 'add') {
    if (!patch.anchor) {
      return { ok: true, content: skill.replace(/\s*$/, '\n\n') + patch.payload.replace(/\s*$/, '') + '\n' };
    }
    if (!skill.includes(patch.anchor)) {
      return { ok: false, reason: `anchor not found: ${truncate(patch.anchor)}` };
    }
    const insertAt = skill.indexOf(patch.anchor) + patch.anchor.length;
    const before = skill.slice(0, insertAt);
    const after = skill.slice(insertAt).replace(/^\n+/, '');
    const payload = patch.payload.replace(/\s+$/, '');
    return { ok: true, content: `${before}\n\n${payload}\n${after}` };
  }

  if (patch.op === 'delete') {
    if (!patch.anchor) return { ok: false, reason: 'delete requires anchor' };
    if (!skill.includes(patch.anchor)) {
      return { ok: false, reason: `anchor not found: ${truncate(patch.anchor)}` };
    }
    const before = skill.indexOf(patch.anchor);
    const after = before + patch.anchor.length;
    return { ok: true, content: collapseBlankLines(skill.slice(0, before) + skill.slice(after)) };
  }

  if (patch.op === 'replace') {
    if (!patch.anchor) return { ok: false, reason: 'replace requires anchor' };
    if (!skill.includes(patch.anchor)) {
      return { ok: false, reason: `anchor not found: ${truncate(patch.anchor)}` };
    }
    return { ok: true, content: skill.replace(patch.anchor, patch.payload) };
  }

  return { ok: false, reason: `unknown op: ${(patch as Patch).op}` };
}

function truncate(s: string, n = 60): string {
  return s.length <= n ? s : s.slice(0, n) + '...';
}

function collapseBlankLines(s: string): string {
  return s.replace(/\n{3,}/g, '\n\n');
}
