const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
const { classify, loadConfig, resolveTarget, canSendKey, DEFAULTS } = require('../lib/system-one.js');

const QUESTIONS = { correction: { type: 'noul', instructions: 'Is this a correction?' } };
const PROMPT_SUBMIT = path.join(__dirname, '..', 'prompt-submit.js');

function startServer(handler) {
  return new Promise(resolve => {
    const hits = [];
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        hits.push({ headers: req.headers, body: body ? JSON.parse(body) : null });
        handler(req, res);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, hits, url: `http://127.0.0.1:${server.address().port}/v1/systemone` });
    });
  });
}

function reply(status, payload) {
  return (req, res) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
  };
}

function laya(url, extra = {}) {
  return { ...DEFAULTS, enabled: true, provider: 'laya', laya_url: url, ...extra };
}

function tempHome(systemOne) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-s1-'));
  if (systemOne) {
    fs.mkdirSync(path.join(home, '.pro-workflow'));
    fs.writeFileSync(path.join(home, '.pro-workflow', 'config.json'), JSON.stringify({ system_one: systemOne }));
  }
  return home;
}

function runHook(input, home) {
  return new Promise(resolve => {
    const env = { ...process.env, HOME: home, TMPDIR: home };
    delete env.PRO_WORKFLOW_SYSTEM_ONE;
    delete env.TYPESAFE_API_KEY;
    const child = spawn(process.execPath, [PROMPT_SUBMIT], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', c => { stdout += c; });
    child.stderr.on('data', c => { stderr += c; });
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test('off by default in the shipped config', () => {
  const cfg = loadConfig({}, [path.join(__dirname, '..', '..', 'config.json')]);
  assert.equal(cfg.enabled, false);
  assert.equal(resolveTarget(cfg, {}), null);
});

test('disabled makes no request and returns null', async () => {
  let called = 0;
  const result = await classify('state', QUESTIONS, {
    config: { ...DEFAULTS, enabled: false },
    fetch: () => { called++; return Promise.resolve({ ok: true, json: () => ({ answers: {} }) }); },
  });
  assert.equal(result, null);
  assert.equal(called, 0);
});

test('env override switches the layer on and off', () => {
  assert.equal(loadConfig({ PRO_WORKFLOW_SYSTEM_ONE: 'laya' }, []).enabled, true);
  assert.equal(loadConfig({ PRO_WORKFLOW_SYSTEM_ONE: 'off' }, []).enabled, false);
  const jev = loadConfig({ PRO_WORKFLOW_SYSTEM_ONE: 'jev' }, []);
  assert.equal(jev.provider, 'jev');
});

test('jev without TYPESAFE_API_KEY is treated as disabled', async () => {
  let called = 0;
  const cfg = { ...DEFAULTS, enabled: true, provider: 'jev' };
  assert.equal(resolveTarget(cfg, {}), null);
  const result = await classify('state', QUESTIONS, { config: cfg, env: {}, fetch: () => { called++; } });
  assert.equal(result, null);
  assert.equal(called, 0);
});

test('jev with a key sends a pinned model and bearer auth', async () => {
  let seen;
  await classify('state', QUESTIONS, {
    config: { ...DEFAULTS, enabled: true, provider: 'jev' },
    env: { TYPESAFE_API_KEY: 'k-test' },
    fetch: (url, init) => {
      seen = { url, init };
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ answers: {} }) });
    },
  });
  assert.equal(seen.url, DEFAULTS.jev_url);
  assert.equal(seen.init.headers.authorization, 'Bearer k-test');
  assert.equal(JSON.parse(seen.init.body).model, 'jev-1.13.0');
});

test('bearer key only goes to https or loopback', async () => {
  assert.equal(canSendKey('https://api.typesafe.ai/v1/systemone'), true);
  assert.equal(canSendKey('http://127.0.0.1:8791/v1/systemone'), true);
  assert.equal(canSendKey('http://localhost:8791/v1/systemone'), true);
  assert.equal(canSendKey('http://[::1]:8791/v1/systemone'), true);
  assert.equal(canSendKey('http://10.0.0.5:8791/v1/systemone'), false);
  assert.equal(canSendKey('http://laya.lan/v1/systemone'), false);
  assert.equal(canSendKey('not a url'), false);

  let seen;
  await classify('state', QUESTIONS, {
    config: { ...DEFAULTS, enabled: true, provider: 'laya', laya_url: 'http://10.0.0.5:8791/v1/systemone' },
    env: { LAYA_API_KEY: 'lk' },
    fetch: (url, init) => {
      seen = init;
      return Promise.resolve({ ok: false });
    },
  });
  assert.equal(seen.headers.authorization, undefined);
});

test('enabled laya parses answers from the server', async () => {
  const answers = { correction: { noul: 0.95, confidence: 0.95 } };
  const { server, hits, url } = await startServer(reply(200, { answers, usage: { input_tokens: 9, output_tokens: 0 } }));
  try {
    const result = await classify('undo that', QUESTIONS, { config: laya(url, { timeout_ms: 2000 }), env: { LAYA_API_KEY: 'lk' } });
    assert.deepStrictEqual(result, answers);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].body.model, 'multilingual');
    assert.equal(hits[0].body.state, 'undo that');
    assert.equal(hits[0].headers.authorization, 'Bearer lk');
  } finally {
    server.close();
  }
});

test('server error returns null', async () => {
  const { server, url } = await startServer(reply(500, { error: 'boom' }));
  try {
    assert.equal(await classify('s', QUESTIONS, { config: laya(url, { timeout_ms: 2000 }), env: {} }), null);
  } finally {
    server.close();
  }
});

test('slow server returns null within the timeout budget', async () => {
  const { server, url } = await startServer((req, res) => {
    setTimeout(() => reply(200, { answers: {} })(req, res), 1000);
  });
  try {
    const started = Date.now();
    const result = await classify('s', QUESTIONS, { config: laya(url, { timeout_ms: 100 }), env: {} });
    assert.equal(result, null);
    assert.ok(Date.now() - started < 600, `took ${Date.now() - started}ms`);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('unreachable server returns null', async () => {
  assert.equal(await classify('s', QUESTIONS, { config: laya('http://127.0.0.1:1/v1/systemone', { timeout_ms: 500 }), env: {} }), null);
});

test('prompt-submit stays quiet on stdout and sends nothing when disabled', async () => {
  const { server, hits, url } = await startServer(reply(200, { answers: { correction: { noul: 0.99 } } }));
  try {
    const home = tempHome({ enabled: false, laya_url: url });
    const input = JSON.stringify({ prompt: 'please look at the tests again', session_id: 's1' });
    const out = await runHook(input, home);
    assert.equal(out.code, 0);
    assert.equal(out.stdout, '');
    assert.doesNotMatch(out.stderr, /Correction detected/);
    assert.equal(hits.length, 0);

    const heuristic = await runHook(JSON.stringify({ prompt: 'undo that change', session_id: 's1' }), home);
    assert.match(heuristic.stderr, /Correction detected - use \/learn/);
    assert.equal(hits.length, 0);
  } finally {
    server.close();
  }
});

test('prompt-submit flags a classifier correction when enabled', async () => {
  const { server, hits, url } = await startServer(reply(200, { answers: { correction: { noul: 0.97 } } }));
  try {
    const home = tempHome({ enabled: true, laya_url: url, timeout_ms: 2000 });
    const input = JSON.stringify({ prompt: 'that is the wrong branch, use the release one', session_id: 's2' });
    const out = await runHook(input, home);
    assert.equal(out.code, 0);
    assert.equal(out.stdout, '');
    assert.match(out.stderr, /system-one classifier \(p=0\.97\)/);
    assert.equal(hits.length, 1);
  } finally {
    server.close();
  }
});

test('prompt-submit ignores a classifier score below the threshold', async () => {
  const { server, url } = await startServer(reply(200, { answers: { correction: { noul: 0.4 } } }));
  try {
    const home = tempHome({ enabled: true, laya_url: url, timeout_ms: 2000 });
    const out = await runHook(JSON.stringify({ prompt: 'now add a readme section', session_id: 's3' }), home);
    assert.doesNotMatch(out.stderr, /Correction detected/);
  } finally {
    server.close();
  }
});

test('spawnSync sanity: script exists', () => {
  assert.equal(spawnSync(process.execPath, ['--check', PROMPT_SUBMIT]).status, 0);
});
