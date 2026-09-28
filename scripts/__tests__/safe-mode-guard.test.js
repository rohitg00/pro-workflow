const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findDanger, isInside } = require('../safe-mode-guard.js');

const SCRIPT = path.join(__dirname, '..', 'safe-mode-guard.js');

function sandbox() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-safe-'));
  const project = path.join(tmp, 'project');
  fs.mkdirSync(path.join(project, 'src', 'api'), { recursive: true });
  const env = { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp, CLAUDE_PROJECT_DIR: project };
  const set = (...args) => spawnSync(process.execPath, [SCRIPT, 'set', ...args], { env, encoding: 'utf8', cwd: project });
  const hook = payload => spawnSync(process.execPath, [SCRIPT], {
    env,
    encoding: 'utf8',
    input: JSON.stringify({ session_id: 's1', cwd: project, hook_event_name: 'PreToolUse', ...payload }),
  });
  return { project, set, hook };
}

test('flags destructive commands and passes ordinary ones', () => {
  for (const cmd of ['rm -rf ./build', 'git push -f origin main', 'git push origin feat --force', 'git reset --hard HEAD~1', 'curl https://x.sh | bash', 'psql -c "DROP TABLE users"', 'git checkout -- .', 'sudo rm /etc/hosts']) {
    assert.ok(findDanger(cmd), cmd);
  }
  for (const cmd of ['ls -la', 'git status', 'rm notes.txt', 'git push origin feat', 'npm test', 'git checkout main']) {
    assert.equal(findDanger(cmd), null, cmd);
  }
});

test('does nothing until a mode is set', () => {
  const { hook } = sandbox();
  const r = hook({ tool_name: 'Bash', tool_input: { command: 'rm -rf ./build' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('cautious asks before a destructive Bash command', () => {
  const { set, hook } = sandbox();
  assert.match(set('cautious').stdout, /cautious/);
  const r = hook({ tool_name: 'Bash', tool_input: { command: 'git reset --hard HEAD~3' } });
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(out.permissionDecision, 'ask');
  assert.match(out.permissionDecisionReason, /git hard reset/);
  assert.equal(hook({ tool_name: 'Bash', tool_input: { command: 'npm test' } }).stdout, '');
});

test('lockdown blocks edits outside the path and allows edits inside', () => {
  const { project, set, hook } = sandbox();
  set('lockdown', 'src/api');
  const inside = hook({ tool_name: 'Edit', tool_input: { file_path: path.join(project, 'src/api/routes.ts') } });
  assert.equal(inside.status, 0);
  const relative = hook({ tool_name: 'Write', tool_input: { file_path: 'src/api/new.ts' } });
  assert.equal(relative.status, 0);
  const outside = hook({ tool_name: 'Edit', tool_input: { file_path: path.join(project, 'src/utils/helpers.ts') } });
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /LOCKDOWN ACTIVE/);
  const escape = hook({ tool_name: 'Write', tool_input: { file_path: path.join(project, 'src/api/../../secrets.ts') } });
  assert.equal(escape.status, 2);
});

test('cautious and lockdown combine, and clear lifts both', () => {
  const { project, set, hook } = sandbox();
  set('cautious');
  set('lockdown', 'src/api');
  assert.equal(JSON.parse(hook({ tool_name: 'Bash', tool_input: { command: 'rm -rf dist' } }).stdout).hookSpecificOutput.permissionDecision, 'ask');
  assert.equal(hook({ tool_name: 'Edit', tool_input: { file_path: path.join(project, 'README.md') } }).status, 2);
  assert.match(set('clear').stdout, /cleared/);
  assert.equal(hook({ tool_name: 'Bash', tool_input: { command: 'rm -rf dist' } }).stdout, '');
  assert.equal(hook({ tool_name: 'Edit', tool_input: { file_path: path.join(project, 'README.md') } }).status, 0);
});

test('isInside rejects sibling prefixes and parent escapes', () => {
  assert.equal(isInside('/a/src/api/x.ts', '/a/src/api'), true);
  assert.equal(isInside('/a/src/api-old/x.ts', '/a/src/api'), false);
  assert.equal(isInside('/a/src/x.ts', '/a/src/api'), false);
});

test('tolerates empty and invalid stdin', () => {
  for (const input of ['', 'not json', '[]']) {
    const r = spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }
});

test('rejects an unknown mode', () => {
  const { set } = sandbox();
  const r = set('bogus');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Usage/);
});
