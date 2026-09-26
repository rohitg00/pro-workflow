const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULTS = {
  enabled: false,
  provider: 'laya',
  laya_url: 'http://127.0.0.1:8791/v1/systemone',
  laya_model: 'multilingual',
  jev_url: 'https://api.typesafe.ai/v1/systemone',
  jev_model: 'jev-1.13.0',
  timeout_ms: 150,
  correction_threshold: 0.9,
};

function readSection(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed.system_one === 'object' ? parsed.system_one : {};
  } catch {
    return {};
  }
}

function loadConfig(env = process.env, files) {
  const sources = files || [
    path.join(__dirname, '..', '..', 'config.json'),
    path.join(os.homedir(), '.pro-workflow', 'config.json'),
  ];
  const cfg = { ...DEFAULTS };
  for (const file of sources) Object.assign(cfg, readSection(file));

  const override = (env.PRO_WORKFLOW_SYSTEM_ONE || '').trim().toLowerCase();
  if (override === 'off') cfg.enabled = false;
  if (override === 'laya' || override === 'jev') {
    cfg.enabled = true;
    cfg.provider = override;
  }
  return cfg;
}

function resolveTarget(cfg, env = process.env) {
  if (!cfg.enabled) return null;
  if (cfg.provider === 'jev') {
    const key = env.TYPESAFE_API_KEY;
    if (!key) return null;
    return { url: cfg.jev_url, model: cfg.jev_model, key };
  }
  if (cfg.provider === 'laya') {
    return { url: cfg.laya_url, model: cfg.laya_model, key: env.LAYA_API_KEY || null };
  }
  return null;
}

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function canSendKey(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' || (protocol === 'http:' && LOOPBACK.has(hostname));
  } catch {
    return false;
  }
}

async function classify(state, questions, options = {}) {
  const env = options.env || process.env;
  const cfg = options.config || loadConfig(env);
  const target = resolveTarget(cfg, env);
  if (!target) return null;

  const doFetch = options.fetch || globalThis.fetch;
  if (typeof doFetch !== 'function') return null;

  const timeoutMs = Number(cfg.timeout_ms) > 0 ? Number(cfg.timeout_ms) : DEFAULTS.timeout_ms;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { 'content-type': 'application/json' };
  if (target.key && canSendKey(target.url)) headers.authorization = `Bearer ${target.key}`;

  try {
    const res = await doFetch(target.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: target.model, state, questions }),
      signal: controller.signal,
    });
    if (!res || !res.ok) return null;
    const body = await res.json();
    return body && typeof body.answers === 'object' ? body.answers : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { DEFAULTS, loadConfig, resolveTarget, canSendKey, classify };
