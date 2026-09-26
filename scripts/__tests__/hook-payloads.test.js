const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPTS = path.join(__dirname, '..');
const COMMON = {
  session_id: 'abc123',
  transcript_path: '/tmp/t.jsonl',
  cwd: '/tmp',
  permission_mode: 'auto',
};

function run(script, payload, env = {}) {
  const tmp = env.TMPDIR || fs.mkdtempSync(path.join(os.tmpdir(), 'pw-hook-'));
  const res = spawnSync(process.execPath, [path.join(SCRIPTS, script)], {
    input: typeof payload === 'string' ? payload : JSON.stringify({ ...COMMON, ...payload }),
    env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp, ...env },
    encoding: 'utf8',
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr, tmp };
}

function quiet(r) {
  assert.equal(r.stdout, '', 'stdout must stay empty so Claude Code does not parse the input echo as hook output');
}

test('Notification uses notification_type', () => {
  const r = run('notification-handler.js', {
    hook_event_name: 'Notification',
    message: 'Claude needs your permission to use Bash',
    notification_type: 'permission_prompt',
  });
  assert.equal(r.code, 0);
  quiet(r);
  assert.match(r.stderr, /Permission prompt waiting: Claude needs your permission to use Bash/);
});

test('PermissionRequest reads tool_name', () => {
  const r = run('permission-request.js', {
    hook_event_name: 'PermissionRequest',
    tool_name: 'Bash',
    tool_input: { command: 'rm -rf node_modules' },
  });
  assert.equal(r.code, 0);
  quiet(r);
  assert.match(r.stderr, /Dangerous operation requested: bash cmd: rm -rf node_modules/);
});

test('PostToolUseFailure reads tool_name and error, skips interrupts', () => {
  const payload = {
    hook_event_name: 'PostToolUseFailure',
    tool_name: 'Bash',
    tool_input: { command: 'npm test' },
    tool_use_id: 'toolu_1',
    error: "Exit code 1\nError: Cannot find module 'express'",
    is_interrupt: false,
  };
  const r = run('tool-failure.js', payload);
  assert.equal(r.code, 0);
  quiet(r);
  assert.match(r.stderr, /Tool failed: Bash \(Exit code 1\)/);
  const i = run('tool-failure.js', { ...payload, is_interrupt: true });
  assert.equal(i.stderr, '');
});

test('SubagentStart and SubagentStop read agent_type and agent_id', () => {
  const start = run('subagent-start.js', { hook_event_name: 'SubagentStart', agent_id: 'agent-1', agent_type: 'Explore' });
  quiet(start);
  assert.match(start.stderr, /Subagent started: Explore \[agent-1\]/);
  const stop = run('subagent-stop.js', {
    hook_event_name: 'SubagentStop',
    stop_hook_active: false,
    agent_id: 'def456',
    agent_type: 'pro-workflow:reviewer',
    last_assistant_message: 'done',
  });
  quiet(stop);
  assert.match(stop.stderr, /Subagent finished: pro-workflow:reviewer \[def456\]/);
});

test('TaskCreated and TaskCompleted read task fields', () => {
  const task = {
    task_id: 'task-001',
    task_subject: 'Implement user authentication',
    task_description: 'Add login and signup endpoints',
    teammate_name: 'implementer',
  };
  const created = run('task-created.js', { hook_event_name: 'TaskCreated', ...task });
  quiet(created);
  assert.equal(created.stderr, '');
  const bare = run('task-created.js', { hook_event_name: 'TaskCreated', task_id: 't', task_subject: 'x' });
  assert.match(bare.stderr, /too short/);
  const done = run('task-completed.js', { hook_event_name: 'TaskCompleted', ...task });
  quiet(done);
  assert.match(done.stderr, /Task completed: Implement user authentication by implementer/);
});

test('TeammateIdle reads teammate_name', () => {
  const r = run('teammate-idle.js', { hook_event_name: 'TeammateIdle', teammate_name: 'researcher' });
  quiet(r);
  assert.match(r.stderr, /Teammate idle: researcher/);
});

test('StopFailure maps the documented error enum', () => {
  const cases = {
    rate_limit: /Rate limited/,
    authentication_failed: /run \/login/,
    model_not_found: /\/model/,
    max_output_tokens: /output token limit/,
    something_new: /Consider retrying/,
  };
  for (const [error, advice] of Object.entries(cases)) {
    const r = run('stop-failure.js', {
      hook_event_name: 'StopFailure',
      error,
      error_details: '429 Too Many Requests',
      last_assistant_message: 'API Error',
    });
    assert.equal(r.code, 0);
    quiet(r);
    assert.match(r.stderr, new RegExp('API error occurred: ' + error));
    assert.match(r.stderr, /Details: 429 Too Many Requests/);
    assert.match(r.stderr, advice);
  }
});

test('CwdChanged reads new_cwd', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-cwd-'));
  const r = run('cwd-changed.js', { hook_event_name: 'CwdChanged', old_cwd: '/tmp', new_cwd: dir });
  quiet(r);
  assert.match(r.stderr, new RegExp('Directory changed: ' + path.basename(dir)));
});

test('ConfigChange reads file_path and source', () => {
  const withFile = run('config-watcher.js', {
    hook_event_name: 'ConfigChange',
    source: 'project_settings',
    file_path: '/repo/.claude/settings.json',
  });
  quiet(withFile);
  assert.match(withFile.stderr, /Config changed: settings.json/);
  const log = fs.readFileSync(path.join(withFile.tmp, 'pro-workflow', 'config-changes.log'), 'utf8');
  assert.match(log, /\/repo\/.claude\/settings.json/);
  const sourceOnly = run('config-watcher.js', { hook_event_name: 'ConfigChange', source: 'user_settings' });
  assert.match(sourceOnly.stderr, /Config changed: user_settings/);
});

test('PreCompact saves trigger and PostCompact reads compact_summary', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-compact-'));
  const pre = run('pre-compact.js', { hook_event_name: 'PreCompact', trigger: 'manual', custom_instructions: 'keep the plan' }, { TMPDIR: tmp });
  quiet(pre);
  const saved = fs.readdirSync(path.join(tmp, 'pro-workflow', 'compacts'));
  const state = JSON.parse(fs.readFileSync(path.join(tmp, 'pro-workflow', 'compacts', saved[0]), 'utf8'));
  assert.equal(state.trigger, 'manual');
  assert.equal(state.custom_instructions, 'keep the plan');
  const post = run('post-compact.js', { hook_event_name: 'PostCompact', trigger: 'manual', compact_summary: 'Summary of work' }, { TMPDIR: tmp });
  quiet(post);
  assert.match(post.stderr, /Trigger: manual/);
  assert.match(post.stderr, /Summary: Summary of work/);
});

test('Stop learn-capture reads last_assistant_message without echoing', () => {
  const r = run('learn-capture.js', { hook_event_name: 'Stop', stop_hook_active: false, last_assistant_message: 'no learnings here' });
  assert.equal(r.code, 0);
  quiet(r);
});

test('reread-tracker warns by default and blocks only when opted in', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-reread-'));
  const file = path.join(tmp, 'a.txt');
  fs.writeFileSync(file, 'x');
  const past = new Date(Date.now() - 60000);
  fs.utimesSync(file, past, past);
  const pre = { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: file } };
  const post = { ...pre, hook_event_name: 'PostToolUse', tool_response: {} };
  const env = { TMPDIR: tmp, PRO_WORKFLOW_REREAD_BLOCK: '0' };
  const context = r => JSON.parse(r.stdout).hookSpecificOutput.additionalContext;

  const first = run('reread-tracker.js', pre, env);
  assert.equal(first.code, 0);
  quiet(first);
  run('reread-tracker.js', post, env);

  const second = run('reread-tracker.js', pre, env);
  assert.equal(second.code, 0);
  assert.equal(second.stderr, '');
  assert.equal(JSON.parse(second.stdout).hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(context(second), /Re-reading a.txt \(2x\)/);
  run('reread-tracker.js', post, env);
  assert.match(context(run('reread-tracker.js', pre, env)), /\(3x\)/);

  const blocked = run('reread-tracker.js', pre, { ...env, PRO_WORKFLOW_REREAD_BLOCK: '1' });
  assert.equal(blocked.code, 2);
  assert.match(blocked.stderr, /Re-reading a.txt/);
});

test('reread-tracker ignores a Read that never completed', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-reread-'));
  const file = path.join(tmp, 'b.txt');
  fs.writeFileSync(file, 'x');
  const pre = { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: file } };
  const env = { TMPDIR: tmp, PRO_WORKFLOW_REREAD_BLOCK: '1' };
  assert.equal(run('reread-tracker.js', pre, env).code, 0);
  const retry = run('reread-tracker.js', pre, env);
  assert.equal(retry.code, 0);
  quiet(retry);
});

test('reread-tracker keeps parallel reads of different files', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-reread-'));
  const past = new Date(Date.now() - 60000);
  const files = ['c.txt', 'd.txt'].map(name => {
    const f = path.join(tmp, name);
    fs.writeFileSync(f, 'x');
    fs.utimesSync(f, past, past);
    return f;
  });
  const env = { TMPDIR: tmp, PRO_WORKFLOW_REREAD_BLOCK: '0' };
  for (const f of files) run('reread-tracker.js', { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: f } }, env);
  for (const f of files) {
    const r = run('reread-tracker.js', { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: f } }, env);
    assert.match(r.stdout, new RegExp(`Re-reading ${path.basename(f)}`));
  }
});

test('scripts tolerate empty and invalid stdin', () => {
  for (const script of ['notification-handler.js', 'permission-request.js', 'tool-failure.js', 'subagent-start.js', 'stop-failure.js', 'reread-tracker.js']) {
    for (const input of ['', 'not json', '[]']) {
      const r = run(script, input);
      assert.ok(r.code === 0, `${script} exited ${r.code} on ${JSON.stringify(input)}`);
      quiet(r);
    }
  }
});

test('no hook script echoes its stdin to stdout', () => {
  for (const file of fs.readdirSync(SCRIPTS).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(SCRIPTS, file), 'utf8');
    assert.doesNotMatch(src, /console\.log\(data\b/, file);
  }
});

test('hooks.json only references scripts that exist and does not replace worktree creation', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(SCRIPTS, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  assert.equal(hooks.WorktreeCreate, undefined);
  for (const entries of Object.values(hooks)) {
    for (const entry of entries) {
      for (const h of entry.hooks) {
        const m = h.command.match(/scripts\/([\w-]+\.js)/);
        if (m) assert.ok(fs.existsSync(path.join(SCRIPTS, m[1])), m[1]);
      }
    }
  }
});
