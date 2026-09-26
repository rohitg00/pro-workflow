const { test } = require('node:test');
const assert = require('node:assert');
const { extractMessage, validate } = require('../commit-validate.js');

const blocks = cmd => {
  const { msg } = extractMessage(cmd);
  return msg !== null && !validate(msg).ok;
};

test('ignores commands that are not git commit', () => {
  for (const cmd of [
    "python3 - <<'EOF'\nimport json\nprint(1)\nEOF",
    "cd /tmp/x && sed -i '' 's/a/b/' f.py && python3 - <<'PY'\nrows=[]\nPY",
    "cat >> src/lib.rs <<'RS'\npub const X: &str = \"x\";\nRS",
    'python3 -m http.server 8080',
    'git commits-graph',
    'git log --grep=commit',
  ]) {
    assert.deepStrictEqual(extractMessage(cmd), { msg: null, form: 'empty' }, cmd);
  }
});

test('never blocks when git commit only appears as text', () => {
  assert.equal(blocks("echo 'run git commit --amend later' && node - <<'EOF'\nconsole.log(1)\nEOF"), false);
});

test('validates -m messages', () => {
  assert.equal(blocks("git commit -am 'bad msg'"), true);
  assert.equal(blocks('git commit -m "feat: add x"'), false);
  assert.equal(blocks('git commit -m "(MOT-12) fix(api): y"'), false);
  assert.equal(blocks('git commit -m "not conventional"'), true);
  assert.equal(blocks("git -C /tmp/r commit -qm 'fix: z'"), false);
  assert.equal(blocks('cd /tmp/r && git add -A && git commit -m "wip"'), true);
  assert.equal(blocks('git commit --message="docs: readme"'), false);
});

test('reads the heredoc inside -m "$(cat <<EOF ...)"', () => {
  const ok = 'git commit -m "$(cat <<\'EOF\'\nfeat(hooks): add guard\n\nbody\nEOF\n)"';
  const bad = 'git commit -m "$(cat <<\'EOF\'\nupdated stuff\nEOF\n)"';
  assert.deepStrictEqual(extractMessage(ok), { msg: 'feat(hooks): add guard', form: 'heredoc' });
  assert.equal(blocks(bad), true);
});

test('reads heredoc fed to -F -', () => {
  assert.equal(blocks("git commit -F - <<'EOF'\nchore: bump\nEOF"), false);
  assert.equal(blocks("git commit -F - <<'EOF'\nbump\nEOF"), true);
});

test('skips file, editor, and amend forms', () => {
  assert.equal(extractMessage('git commit -F /tmp/msg.txt').form, 'file');
  assert.equal(extractMessage('git commit').form, 'editor');
  assert.equal(extractMessage('git commit --amend --no-edit').form, 'unknown');
});
