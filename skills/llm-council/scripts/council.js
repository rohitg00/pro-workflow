#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..', '..', '..');
const COUNCIL_ROOT = path.join(os.homedir(), '.pro-workflow', 'council');

const PROVIDERS = {
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com',
    defaultModels: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    defaultChairman: 'claude-opus-4-7',
    call: callAnthropic,
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    defaultChairman: 'gpt-4o',
    call: callOpenAICompat,
  },
  openrouter: {
    envKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModels: ['anthropic/claude-opus-4', 'openai/gpt-4o', 'google/gemini-2.0-flash'],
    defaultChairman: 'anthropic/claude-opus-4',
    call: callOpenAICompat,
  },
  fireworks: {
    envKey: 'FIREWORKS_API_KEY',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModels: [
      'accounts/fireworks/models/glm-5',
      'accounts/fireworks/models/deepseek-v3p2',
      'accounts/fireworks/models/kimi-k2p5',
    ],
    defaultChairman: 'accounts/fireworks/models/glm-5',
    call: callOpenAICompat,
  },
  custom: {
    envKey: 'LLM_COUNCIL_API_KEY',
    baseUrl: process.env.LLM_COUNCIL_BASE_URL || '',
    defaultModels: (process.env.LLM_COUNCIL_MODELS || '').split(',').filter(Boolean),
    defaultChairman: process.env.LLM_COUNCIL_CHAIRMAN || '',
    call: callOpenAICompat,
  },
};

function pickProvider(arg) {
  if (arg && PROVIDERS[arg]) return arg;
  for (const [name, p] of Object.entries(PROVIDERS)) {
    if (process.env[p.envKey]) return name;
  }
  return null;
}

function postJSON(urlStr, body, headers, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, res => {
      let chunks = '';
      res.on('data', c => { chunks += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('council request timeout')));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function callOpenAICompat(provider, model, system, user) {
  const start = Date.now();
  const url = `${provider.baseUrl}/chat/completions`;
  const res = await postJSON(url, {
    model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: 4000,
    temperature: 1,
  }, { Authorization: `Bearer ${process.env[provider.envKey]}` });
  const elapsed = Date.now() - start;
  if (res.status >= 400) return { success: false, content: `[ERROR ${res.status}: ${res.body.slice(0, 300)}]`, model, latency_ms: elapsed };
  let data;
  try { data = JSON.parse(res.body); } catch (e) { return { success: false, content: `[parse-error]`, model, latency_ms: elapsed }; }
  const content = data.choices?.[0]?.message?.content || '';
  return { success: true, content, model, latency_ms: elapsed, tokens: data.usage || {} };
}

async function callAnthropic(provider, model, system, user) {
  const start = Date.now();
  const url = `${provider.baseUrl}/v1/messages`;
  const res = await postJSON(url, {
    model,
    max_tokens: 4000,
    system,
    messages: [{ role: 'user', content: user }],
  }, {
    'x-api-key': process.env[provider.envKey],
    'anthropic-version': '2023-06-01',
  });
  const elapsed = Date.now() - start;
  if (res.status >= 400) return { success: false, content: `[ERROR ${res.status}: ${res.body.slice(0, 300)}]`, model, latency_ms: elapsed };
  let data;
  try { data = JSON.parse(res.body); } catch { return { success: false, content: '[parse-error]', model, latency_ms: elapsed }; }
  const content = (data.content || []).map(b => b.text || '').join('');
  return { success: true, content, model, latency_ms: elapsed, tokens: data.usage || {} };
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out[key] = next; i++; }
      else out[key] = true;
    } else out._.push(a);
  }
  return out;
}

function ts() { return new Date().toISOString().replace(/[:.]/g, '-'); }

function persistToWiki(slug, sessionId, output) {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) return null;
  const { createStore } = require(distPath);
  const store = createStore();
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) return null;
    const relPath = path.posix.join('derived', 'council', `${sessionId}.md`);
    const fileAbs = path.join(wiki.root_path, relPath);
    fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
    fs.writeFileSync(fileAbs, output);
    store.upsertWikiPage({
      wiki_slug: slug,
      rel_path: relPath,
      title: `Council session ${sessionId}`,
      summary: output.slice(0, 500),
      content: output,
      page_type: 'council',
      content_hash: null,
    });
    return fileAbs;
  } finally { store.close(); }
}

async function cmdRun(args) {
  const query = args._[0];
  if (!query) { console.error('run: query required'); process.exit(1); }
  const providerName = pickProvider(args.provider);
  if (!providerName) { console.error('No provider env var set. Try ANTHROPIC_API_KEY or OPENAI_API_KEY.'); process.exit(2); }
  const provider = PROVIDERS[providerName];
  if (!provider.baseUrl) { console.error(`provider ${providerName} requires LLM_COUNCIL_BASE_URL`); process.exit(2); }

  const models = (args.models ? String(args.models).split(',') : provider.defaultModels).filter(Boolean);
  const chairman = args.chairman || provider.defaultChairman;
  if (!models.length) { console.error('no models — pass --models'); process.exit(2); }
  if (!chairman) { console.error('no chairman — pass --chairman'); process.exit(2); }

  const sessionId = ts();
  const sessionDir = path.join(COUNCIL_ROOT, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  fs.writeFileSync(path.join(sessionDir, 'config.json'), JSON.stringify({ query, models, chairman, provider: providerName }, null, 2));

  function settledToEntry(model, settled) {
    if (settled.status === 'fulfilled') return settled.value;
    return { success: false, content: `[ERROR: ${settled.reason?.message || settled.reason}]`, model, latency_ms: 0 };
  }

  // Phase 1
  const sysIndep = 'You are participating in an LLM council deliberation. Provide your best, most thoughtful response to the query. Be comprehensive but focused.';
  const phase1Settled = await Promise.allSettled(models.map(m => provider.call(provider, m, sysIndep, query)));
  const phase1Entries = phase1Settled.map((s, i) => settledToEntry(models[i], s));
  const phase1 = Object.fromEntries(models.map((m, i) => [m, phase1Entries[i]]));
  fs.writeFileSync(path.join(sessionDir, 'phase1_responses.json'), JSON.stringify(phase1, null, 2));

  // Phase 2
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, models.length);
  const labelOf = Object.fromEntries(models.map((m, i) => [m, labels[i]]));
  const anon = models.map(m => `=== Response ${labelOf[m]} ===\n${phase1[m].content}`).join('\n\n');
  const sysRank = (own) => `You are ranking AI responses objectively. Your own response is labeled '${own}'.`;
  const userRank = `QUERY:\n${query}\n\nRESPONSES:\n${anon}\n\nRank from BEST to WORST. Format:\nRANKINGS:\n1. [Letter] - [reason]\n2. [Letter] - [reason]\n...`;
  const phase2Settled = await Promise.allSettled(models.map(m => provider.call(provider, m, sysRank(labelOf[m]), userRank)));
  const phase2Entries = phase2Settled.map((s, i) => settledToEntry(models[i], s));
  const phase2 = { label_of: labelOf, rankings: Object.fromEntries(models.map((m, i) => [m, phase2Entries[i]])) };
  fs.writeFileSync(path.join(sessionDir, 'phase2_rankings.json'), JSON.stringify(phase2, null, 2));

  // Phase 3
  const responsesText = models.map(m => `=== ${labelOf[m]}: ${m} ===\n${phase1[m].content}`).join('\n\n');
  const rankingsText = models.map(m => `[${m}'s Rankings]\n${phase2.rankings[m].content}`).join('\n\n');
  const sysSynth = 'You are the Chairman of an LLM Council. Synthesize multiple AI perspectives into a definitive, comprehensive response.';
  const userSynth = `ORIGINAL QUERY:\n${query}\n\nINDIVIDUAL RESPONSES:\n${responsesText}\n\nMODEL RANKINGS:\n${rankingsText}\n\nProduce the FINAL SYNTHESIS:`;
  const synth = await provider.call(provider, chairman, sysSynth, userSynth);
  fs.writeFileSync(path.join(sessionDir, 'phase3_synthesis.txt'), synth.content);

  // Render
  const out = [];
  out.push(`# LLM Council Deliberation`);
  out.push(`Session: ${sessionId} · Provider: ${providerName}`);
  out.push('');
  out.push(`**Query:** ${query}`);
  out.push(`**Council:** ${models.join(', ')}`);
  out.push(`**Chairman:** ${chairman}`);
  out.push('');
  out.push('## Phase 1 — Individual responses');
  for (const m of models) {
    out.push(`### [${labelOf[m]}] ${m} (${phase1[m].latency_ms}ms)`);
    out.push(phase1[m].content);
    out.push('');
  }
  out.push('## Phase 2 — Cross-model rankings');
  for (const m of models) {
    out.push(`### ${m}`);
    out.push(phase2.rankings[m].content);
    out.push('');
  }
  out.push('## Phase 3 — Chairman synthesis');
  out.push(`### ${chairman}`);
  out.push(synth.content);

  const md = out.join('\n');
  fs.writeFileSync(path.join(sessionDir, 'final_output.md'), md);

  if (args.wiki) {
    const wikiPath = persistToWiki(args.wiki, sessionId, md);
    if (wikiPath) console.error(`[council] persisted to ${wikiPath}`);
    else console.error(`[council] wiki ${args.wiki} not found, skipping persist`);
  }

  console.log(md);
}

function cmdProviders() {
  const rows = Object.entries(PROVIDERS).map(([name, p]) => ({
    name,
    env_var: p.envKey,
    has_key: !!process.env[p.envKey],
    base_url: p.baseUrl || '(unset)',
    default_models: p.defaultModels,
    default_chairman: p.defaultChairman,
  }));
  console.log(JSON.stringify(rows, null, 2));
}

function cmdShow(args) {
  const id = args._[0];
  if (!id) { console.error('show: session-id required'); process.exit(1); }
  const dir = path.join(COUNCIL_ROOT, id);
  const file = path.join(dir, 'final_output.md');
  if (!fs.existsSync(file)) { console.error('session not found'); process.exit(1); }
  console.log(fs.readFileSync(file, 'utf8'));
}

function usage() {
  console.error(`Usage:
  council.js run "<query>" [--models id1,id2,id3] [--chairman id] [--provider name] [--wiki slug]
  council.js providers
  council.js show <session-id>`);
  process.exit(1);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case 'run': await cmdRun(args); break;
    case 'providers': cmdProviders(); break;
    case 'show': cmdShow(args); break;
    default: usage();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
