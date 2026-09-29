const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { runProviderTask } = require('../lib/provider-runner');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'provider-tools.js');
const FAKE_KEY = 'test-provider-secret-do-not-print';

function text(result) {
  return result.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
}

async function connect(t, env = {}) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [SCRIPT], env, stderr: 'pipe' });
  const client = new Client({ name: 'provider-tools-test', version: '1.0.0' });
  let diagnostics = '';
  transport.stderr.on('data', chunk => { diagnostics += chunk; });
  t.after(async () => {
    await client.close();
    assert.equal(diagnostics, '');
  });
  await client.connect(transport);
  return client;
}

function fixture(t, source) {
  const root = fs.mkdtempSync(path.join(ROOT, '.provider-tools-test-'));
  const script = path.join(root, 'skills', 'llm-council', 'scripts', 'council.js');
  fs.mkdirSync(path.dirname(script), { recursive: true });
  fs.writeFileSync(script, source);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('stdio MCP lists one fixed tool and ignores ambient provider credentials', async t => {
  const client = await connect(t, { OPENAI_API_KEY: FAKE_KEY });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['run_provider_task']);
  assert.deepEqual(tools[0].inputSchema.properties.task.enum, ['council', 'survey', 'embeddings', 'research', 'optimizer']);
  assert.ok(!JSON.stringify(tools).includes(FAKE_KEY));
  const result = await client.callTool({ name: 'run_provider_task', arguments: { task: 'council', args: ['providers'] } });
  assert.equal(result.isError, false);
  const providers = JSON.parse(text(result));
  assert.ok(providers.every(provider => provider.has_key === false));
  assert.ok(!text(result).includes(FAKE_KEY));
});

test('stdio MCP uses configured credentials without disclosing them in provider output', async t => {
  const client = await connect(t, {
    PRO_WORKFLOW_OPENAI_API_KEY: FAKE_KEY,
    LLM_COUNCIL_BASE_URL: `https://example.invalid/${FAKE_KEY}`,
  });
  const result = await client.callTool({ name: 'run_provider_task', arguments: { task: 'council', args: ['providers'], cwd: ROOT } });
  assert.equal(result.isError, false);
  const providers = JSON.parse(text(result));
  assert.equal(providers.find(provider => provider.name === 'openai').has_key, true);
  assert.ok(text(result).includes('[REDACTED]'));
  assert.ok(!text(result).includes(FAKE_KEY));
});

test('stdio MCP rejects unknown tools, scripts, env injection, and invalid arguments', async t => {
  const client = await connect(t);
  const unknown = await client.callTool({ name: 'exec', arguments: {} });
  assert.equal(unknown.isError, true);
  for (const args of [
    { task: '../other-script.js', args: [] },
    { task: 'toString', args: [] },
    { task: { toString: null }, args: [] },
    { task: 'council', args: 'providers' },
    { task: 'council', args: [1] },
    { task: 'council', args: ['providers\0'] },
    { task: 'council', args: ['providers'], cwd: '.' },
    { task: 'council', args: ['providers'], env: { NODE_OPTIONS: '--inspect' } },
    { task: 'council', args: ['providers'], script: '/tmp/other.js' },
  ]) {
    const result = await client.callTool({ name: 'run_provider_task', arguments: args });
    assert.equal(result.isError, true);
    assert.match(text(result), /Invalid task arguments/);
  }
});

test('runner strips unrelated and ambient credentials and passes args literally', async t => {
  const root = fixture(t, `console.log(JSON.stringify({
    ambient: process.env.OPENAI_API_KEY,
    github: process.env.PRO_WORKFLOW_GITHUB_TOKEN,
    legacyGithub: process.env.GH_TOKEN,
    unrelated: process.env.UNRELATED_SECRET,
    laya: process.env.PRO_WORKFLOW_LAYA_API_KEY,
    options: process.env.NODE_OPTIONS,
    configured: !!process.env.PRO_WORKFLOW_OPENAI_API_KEY,
    customUrl: process.env.LLM_COUNCIL_BASE_URL,
    models: process.env.LLM_COUNCIL_MODELS,
    locale: process.env.LC_ALL,
    wikiRoot: process.env.WIKI_ROOT,
    argv: process.argv.slice(2), cwd: process.cwd()
  }));`);
  const literal = '$(touch should-not-exist); echo untouched';
  const result = await runProviderTask({ task: 'council', args: [literal], cwd: root }, {
    root,
    env: {
      OPENAI_API_KEY: 'ambient-secret',
      PRO_WORKFLOW_OPENAI_API_KEY: FAKE_KEY,
      PRO_WORKFLOW_GITHUB_TOKEN: 'unrelated-secret',
      GH_TOKEN: 'legacy-github-secret',
      UNRELATED_SECRET: 'unrelated-service-secret',
      PRO_WORKFLOW_LAYA_API_KEY: 'unrelated-laya-secret',
      NODE_OPTIONS: '--require=./should-not-exist.js',
      LLM_COUNCIL_BASE_URL: 'https://example.invalid/v1',
      LLM_COUNCIL_MODELS: 'test-model',
      LC_ALL: 'C',
      WIKI_ROOT: root,
    },
  });
  assert.equal(result.isError, false);
  assert.deepEqual(JSON.parse(text(result)), {
    configured: true,
    customUrl: 'https://example.invalid/v1',
    models: 'test-model',
    locale: 'C',
    wikiRoot: root,
    argv: [literal],
    cwd: root,
  });
  assert.equal(fs.existsSync(path.join(root, 'should-not-exist')), false);
});

test('runner redacts complete and split credential output and never echoes secret arguments', async t => {
  const root = fixture(t, `const key = process.env.PRO_WORKFLOW_OPENAI_API_KEY;
    process.stdout.write(key.slice(0, 8));
    setTimeout(() => {
      process.stdout.write(key.slice(8));
      console.error(key);
      console.error(process.env.LLM_COUNCIL_BASE_URL);
      process.exitCode = 2;
    }, 10);`);
  const result = await runProviderTask({ task: 'council', args: [] }, {
    root,
    env: {
      PRO_WORKFLOW_OPENAI_API_KEY: FAKE_KEY,
      GH_TOKEN: 'legacy-gh-token-do-not-print',
      LLM_COUNCIL_BASE_URL: 'https://example.invalid/legacy-gh-token-do-not-print',
    },
  });
  assert.equal(result.isError, true);
  assert.equal(text(result), '[REDACTED]\n[REDACTED]\nhttps://example.invalid/[REDACTED]');
  const rejected = await runProviderTask({ task: 'council', args: [FAKE_KEY] }, { root, env: { PRO_WORKFLOW_OPENAI_API_KEY: FAKE_KEY } });
  assert.equal(rejected.isError, true);
  assert.ok(!text(rejected).includes(FAKE_KEY));
});

test('runner drops partial output on overflow so a truncated credential cannot leak', async t => {
  const root = fixture(t, 'process.stdout.write(process.env.PRO_WORKFLOW_OPENAI_API_KEY);');
  const result = await runProviderTask({ task: 'council', args: [] }, { root, env: { PRO_WORKFLOW_OPENAI_API_KEY: FAKE_KEY }, maxOutputBytes: 10 });
  assert.equal(result.isError, true);
  assert.match(text(result), /output exceeded/);
  assert.ok(!text(result).includes(FAKE_KEY.slice(0, 10)));
});

test('runner enforces timeout and request cancellation', async t => {
  const root = fixture(t, 'setInterval(() => {}, 1000);');
  const timed = await runProviderTask({ task: 'council', args: [] }, { root, env: {}, timeoutMs: 50 });
  assert.equal(timed.isError, true);
  assert.match(text(timed), /runtime limit/);
  const controller = new AbortController();
  const pending = runProviderTask({ task: 'council', args: [] }, { root, env: {}, signal: controller.signal });
  setTimeout(() => controller.abort(), 50);
  const cancelled = await pending;
  assert.equal(cancelled.isError, true);
  assert.match(text(cancelled), /cancelled/);
});

test('runner reports build guidance before starting tasks that require compiled code', async t => {
  const root = fixture(t, 'throw new Error("must not run");');
  for (const task of ['survey', 'embeddings', 'research', 'optimizer']) {
    const result = await runProviderTask({ task, args: [] }, { root, env: {} });
    assert.equal(result.isError, true);
    assert.match(text(result), /npm run build/);
  }
  const council = await runProviderTask({ task: 'council', args: ['run', 'query', '--wiki', 'notes'] }, { root, env: {} });
  assert.match(text(council), /npm run build/);
});
