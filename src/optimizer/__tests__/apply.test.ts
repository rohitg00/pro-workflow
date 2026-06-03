import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyPatches } from '../apply';
import { aggregatePatches } from '../aggregate';
import { clipByLR } from '../clip';
import { stripExistingStamp } from '../trainer';
import type { Patch } from '../types';

describe('applyPatches', () => {
  it('appends "add" without anchor at end', () => {
    const out = applyPatches('# Skill\n\n- rule 1\n', [
      { op: 'add', anchor: '', payload: '- rule 2' },
    ]);
    assert.equal(out.applied.length, 1);
    assert.match(out.content, /- rule 2\n$/);
  });

  it('inserts "add" after anchor', () => {
    const out = applyPatches('# Skill\n\n## Rules\n- existing\n', [
      { op: 'add', anchor: '## Rules', payload: '- new-rule' },
    ]);
    assert.match(out.content, /## Rules\n\n- new-rule\n- existing/);
  });

  it('"delete" removes anchor block', () => {
    const out = applyPatches('# A\n\n- bad rule\n\n- good rule\n', [
      { op: 'delete', anchor: '- bad rule\n', payload: '' },
    ]);
    assert.equal(out.applied.length, 1);
    assert.doesNotMatch(out.content, /bad rule/);
    assert.match(out.content, /good rule/);
  });

  it('"replace" swaps anchor for payload', () => {
    const out = applyPatches('# Skill\n- old phrasing\n', [
      { op: 'replace', anchor: 'old phrasing', payload: 'new phrasing' },
    ]);
    assert.match(out.content, /new phrasing/);
  });

  it('skips patches whose anchor is missing', () => {
    const out = applyPatches('# Skill\n', [
      { op: 'replace', anchor: 'nonexistent', payload: 'x' },
    ]);
    assert.equal(out.applied.length, 0);
    assert.equal(out.skipped.length, 1);
    assert.match(out.skipped[0].reason, /anchor not found/);
  });
});

describe('aggregatePatches', () => {
  it('merges identical patches and counts votes', () => {
    const a: Patch = { op: 'add', anchor: '## X', payload: '- foo' };
    const out = aggregatePatches([[a], [a], [a]]);
    assert.equal(out.merged.length, 1);
    assert.equal(out.duplicates, 2);
  });

  it('detects conflicts on same anchor different payload', () => {
    const out = aggregatePatches([
      [{ op: 'replace', anchor: '## X', payload: 'A' }],
      [{ op: 'replace', anchor: '## X', payload: 'B' }],
    ]);
    assert.ok(out.conflicts >= 1);
  });

  it('orders deletes before replaces before adds', () => {
    const out = aggregatePatches([
      [{ op: 'add', anchor: 'a', payload: '1' }],
      [{ op: 'delete', anchor: 'b', payload: '' }],
      [{ op: 'replace', anchor: 'c', payload: '2' }],
    ]);
    assert.equal(out.merged[0].op, 'delete');
    assert.equal(out.merged[1].op, 'replace');
    assert.equal(out.merged[2].op, 'add');
  });
});

describe('apply replace handles $-sequences verbatim', () => {
  it('does not treat $1 in payload as a backreference', () => {
    const out = applyPatches('# A\nold\n', [
      { op: 'replace', anchor: 'old', payload: 'cost: $1 per unit, $2 each' },
    ]);
    assert.match(out.content, /cost: \$1 per unit, \$2 each/);
  });
});

describe('aggregate keeps distinct payloads at same anchor', () => {
  it('does not collide different add payloads at same anchor', () => {
    const out = aggregatePatches([
      [{ op: 'add', anchor: '## X', payload: 'foo' }],
      [{ op: 'add', anchor: '## X', payload: 'bar' }],
    ]);
    assert.equal(out.merged.length, 2);
    assert.ok(out.conflicts >= 1);
  });
});

describe('stripExistingStamp', () => {
  it('removes the trailing optimizer stamp', () => {
    const stamped = '# Skill\nbody\n<!-- skill-optimizer: hash=abc slug=foo -->\n';
    assert.equal(stripExistingStamp(stamped).trimEnd(), '# Skill\nbody');
  });

  it('leaves unstamped content alone', () => {
    const plain = '# Skill\nbody\n';
    assert.equal(stripExistingStamp(plain), plain);
  });

  it('removes multiple accumulated stamps', () => {
    const doubled = '# Skill\nbody\n<!-- skill-optimizer: hash=abc slug=foo -->\n<!-- skill-optimizer: hash=def slug=foo -->\n';
    assert.equal(stripExistingStamp(doubled).trimEnd(), '# Skill\nbody');
  });
});

describe('clipByLR', () => {
  it('respects per-op budget', () => {
    const patches: Patch[] = [
      { op: 'add', anchor: 'a', payload: '1' },
      { op: 'add', anchor: 'b', payload: '2' },
      { op: 'add', anchor: 'c', payload: '3' },
      { op: 'delete', anchor: 'x', payload: '' },
      { op: 'replace', anchor: 'y', payload: 'z' },
    ];
    const out = clipByLR(patches, { maxAdds: 2, maxDeletes: 1, maxReplaces: 1 });
    assert.equal(out.selected.filter((p) => p.op === 'add').length, 2);
    assert.equal(out.clipped.filter((p) => p.op === 'add').length, 1);
    assert.equal(out.selected.length, 4);
  });
});
