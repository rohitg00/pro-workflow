#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..', '..', '..');
const COUNCIL = path.join(PRO_WORKFLOW_ROOT, 'skills', 'llm-council', 'scripts', 'council.js');

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

function die(msg) { console.error(`[survey] ${msg}`); process.exit(1); }

function getStore() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) die(`built store missing at ${distPath}. Run npm run build`);
  return require(distPath).createStore();
}

function postJSON(urlStr, body, headers, timeoutMs = 600000) {
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
    req.setTimeout(timeoutMs, () => req.destroy(new Error('survey request timeout')));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Minimal SSE client for the Messages API stream: collects text deltas and the final stop_reason.
// Streaming keeps the connection active during long generations; the timeout below is an idle
// timeout (no bytes received), not a cap on total generation time.
function postAnthropicStream(urlStr, body, headers, idleTimeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = v => { if (!settled) { settled = true; resolve(v); } };
    const fail = e => { if (!settled) { settled = true; reject(e); } };
    const url = new URL(urlStr);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    }, res => {
      res.setEncoding('utf8');
      // A dropped connection emits 'error'/'close' without 'end'; without this the promise would never
      // settle and node would exit 0 without writing a survey.
      res.on('error', fail);
      res.on('close', () => fail(new Error('survey response closed before end')));
      if (res.statusCode >= 400) {
        let errBody = '';
        res.on('data', c => { errBody += c; });
        res.on('end', () => finish({ status: res.statusCode, body: errBody }));
        return;
      }
      const out = { status: res.statusCode, body: '', text: '', stop_reason: null, usage: {}, error: null, stopped: false };
      let buf = '';
      res.on('data', c => { buf = consumeSSE(buf + c, ev => applyStreamEvent(out, ev)); });
      res.on('end', () => { consumeSSE(buf + '\n\n', ev => applyStreamEvent(out, ev)); finish(out); });
    });
    req.setTimeout(idleTimeoutMs, () => req.destroy(new Error('survey request timeout')));
    req.on('error', fail);
    req.write(data);
    req.end();
  });
}

// Parses complete SSE events out of buf, calls onEvent(json) for each, returns the unparsed remainder.
function consumeSSE(buf, onEvent) {
  const parts = buf.replace(/\r\n/g, '\n').split('\n\n');
  const rest = parts.pop();
  for (const part of parts) {
    const dataLines = part.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart());
    if (!dataLines.length) continue;
    try { onEvent(JSON.parse(dataLines.join('\n'))); } catch { /* skip non-JSON keep-alive lines */ }
  }
  return rest;
}

function applyStreamEvent(out, ev) {
  if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') out.text += ev.delta.text;
  else if (ev.type === 'message_delta') {
    if (ev.delta && ev.delta.stop_reason) out.stop_reason = ev.delta.stop_reason;
    if (ev.usage) out.usage = ev.usage;
  } else if (ev.type === 'message_stop') out.stopped = true;
  else if (ev.type === 'error') out.error = ev.error || ev;
}

const PROVIDER_DEFAULTS = {
  anthropic: { envKey: 'ANTHROPIC_API_KEY', baseUrl: 'https://api.anthropic.com', model: 'claude-opus-5-5' },
  openai: { envKey: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  openrouter: { envKey: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-opus-4' },
  fireworks: { envKey: 'FIREWORKS_API_KEY', baseUrl: 'https://api.fireworks.ai/inference/v1', model: 'accounts/fireworks/models/kimi-k2p5' },
  custom: { envKey: 'LLM_COUNCIL_API_KEY', baseUrl: process.env.LLM_COUNCIL_BASE_URL || '', model: process.env.LLM_COUNCIL_CHAIRMAN || '' },
};

function pickProvider(arg) {
  if (arg && PROVIDER_DEFAULTS[arg]) return arg;
  for (const [name, p] of Object.entries(PROVIDER_DEFAULTS)) if (process.env[p.envKey]) return name;
  return null;
}

async function callProvider(providerName, model, system, user, maxTokens) {
  const p = PROVIDER_DEFAULTS[providerName];
  if (!process.env[p.envKey]) die(`${p.envKey} not set`);
  if (providerName === 'anthropic') {
    // Thinking counts toward max_tokens, so the budget covers thinking plus the survey text.
    const res = await postAnthropicStream(`${p.baseUrl}/v1/messages`, {
      model, max_tokens: maxTokens, stream: true, system, messages: [{ role: 'user', content: user }],
    }, { 'x-api-key': process.env[p.envKey], 'anthropic-version': '2023-06-01' });
    if (res.status >= 400) die(`anthropic error ${res.status}: ${res.body.slice(0, 300)}`);
    if (res.error) die(`anthropic stream error: ${JSON.stringify(res.error).slice(0, 300)}`);
    if (res.stop_reason === 'refusal') die('anthropic refused the request');
    // Only end_turn is a complete survey; max_tokens, model_context_window_exceeded or a dropped
    // stream (null) would write a truncated file.
    if (!res.stopped) die('anthropic stream ended without message_stop; survey would be incomplete');
    if (res.stop_reason !== 'end_turn') die(`anthropic stopped with ${res.stop_reason} (max_tokens ${maxTokens}); survey would be truncated`);
    return res.text;
  }
  const res = await postJSON(`${p.baseUrl}/chat/completions`, {
    model, max_tokens: maxTokens, temperature: 0.7,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  }, { Authorization: `Bearer ${process.env[p.envKey]}` });
  if (res.status >= 400) die(`${providerName} error ${res.status}: ${res.body.slice(0, 300)}`);
  const data = JSON.parse(res.body);
  return data.choices?.[0]?.message?.content || '';
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }

function bibCitationId(key) {
  return `src-bib-${slugify(key)}`;
}

function appendBibliographyToSources(wikiRoot, bibliography) {
  const file = path.join(wikiRoot, 'sources.md');
  let existing = '';
  if (fs.existsSync(file)) existing = fs.readFileSync(file, 'utf8');
  const seenKeys = new Set();
  for (const m of existing.matchAll(/\| (src-bib-[a-z0-9-]+) \|/g)) seenKeys.add(m[1]);

  const newRows = [];
  for (const b of bibliography) {
    const id = bibCitationId(b.key);
    if (seenKeys.has(id)) continue;
    const url = b.url || (b.venue && b.venue.startsWith('arXiv:') ? `https://arxiv.org/abs/${b.venue.slice(6)}` : '');
    newRows.push(`| ${id} | paper | ${url} | ${b.title.replace(/\|/g, '\\|')} | ${b.key} | ${new Date().toISOString().slice(0, 10)} |`);
  }
  if (!newRows.length) return 0;

  const tableHeader = '| id | type | url | title | key | added_at |\n| --- | --- | --- | --- | --- | --- |';
  const hasHeader = existing.includes('| id | type |');
  if (!hasHeader) {
    const prefix = existing.length ? (existing.endsWith('\n') ? existing : existing + '\n') : '';
    fs.writeFileSync(file, `${prefix}${tableHeader}\n${newRows.join('\n')}\n`);
  } else {
    fs.writeFileSync(file, existing.trimEnd() + '\n' + newRows.join('\n') + '\n');
  }
  return newRows.length;
}

function nextVersion(dir, baseSlug) {
  if (!fs.existsSync(dir)) return 1;
  const re = new RegExp(`^${baseSlug}-v(\\d+)\\.md$`);
  let max = 0;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function buildPrompt(bundle) {
  const bibWithIds = bundle.bibliography.map(b => ({ ...b, citation_id: bibCitationId(b.key) }));
  const sectionsWithIds = bundle.sections.map(s => ({
    ...s,
    paper_citation_ids: (s.papers || []).map(k => bibCitationId(k)),
  }));
  return `Compile a literature survey on the topic "${bundle.topic}" using only the papers in the bibliography below.

Output markdown:
- H1 = topic title, followed directly by the first section (no prose under the H1)
- Numbered H2 sections following the provided sections list
- Inline citations as [^citation_id], copying the citation_id field exactly (e.g., [^src-bib-park-2023-generative-agents]) - downstream tooling links these ids to rows in sources.md
- A "## References" section at the end listing every cited [^citation_id] with: citation_id, authors, year, title, venue, one-sentence summary
- No HTML, no SVG, no inline images
- ~600-1200 words per section, scaled by bibliography size
- In each section, cite every paper in its paper_citation_ids at least once, and weave them together rather than listing them

Bibliography:
${JSON.stringify(bibWithIds, null, 2)}

Sections to produce in order:
${JSON.stringify(sectionsWithIds, null, 2)}

Anchor (context only, do not cite):
${bundle.anchor_source || ''}

Cite only works listed in the bibliography; do not add papers that are not there.`;
}

async function cmdRun(args) {
  const bundlePath = args.bundle;
  const slug = args.wiki;
  if (!bundlePath || !slug) die('usage: build-survey.js --bundle <path> --wiki <slug> [--provider name] [--model id]');
  if (!fs.existsSync(bundlePath)) die(`bundle not found: ${bundlePath}`);

  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (!bundle.topic || !Array.isArray(bundle.bibliography)) die('bundle missing topic or bibliography[]');
  const invalid = bundle.bibliography.find(
    b => !b || typeof b.key !== 'string' || !b.key.trim() || typeof b.title !== 'string' || !b.title.trim()
  );
  if (invalid) die('bundle bibliography[] entries must include non-empty string key and title');

  const bibKeys = new Set();
  for (const b of bundle.bibliography) {
    if (bibKeys.has(b.key)) die(`duplicate bibliography key: ${b.key}`);
    bibKeys.add(b.key);
  }

  if (Array.isArray(bundle.sections)) {
    for (const [i, s] of bundle.sections.entries()) {
      if (!Array.isArray(s.papers)) continue;
      for (const k of s.papers) {
        if (typeof k !== 'string' || !k.trim()) die(`sections[${i}].papers contains non-string entry`);
        if (!bibKeys.has(k)) die(`sections[${i}].papers references unknown bibliography key: ${k}`);
      }
    }
  }

  const providerName = pickProvider(args.provider);
  if (!providerName) die('no provider env var set');
  const model = args.model || PROVIDER_DEFAULTS[providerName].model;
  if (!model) die('no model — pass --model');

  const store = getStore();
  let wiki;
  try { wiki = store.getWiki(slug); } finally { store.close(); }
  if (!wiki) die(`unknown wiki: ${slug}`);

  console.error(`[survey] generating with ${providerName}:${model} for wiki ${slug}`);
  const md = await callProvider(providerName, model, 'You are a careful technical-writing assistant generating a literature survey.', buildPrompt(bundle), providerName === 'anthropic' ? 64000 : 16000);

  const surveysDir = path.join(wiki.root_path, 'derived', 'surveys');
  fs.mkdirSync(surveysDir, { recursive: true });
  const baseSlug = slugify(bundle.topic);
  const v = nextVersion(surveysDir, baseSlug);
  const fileName = `${baseSlug}-v${v}.md`;
  const fileAbs = path.join(surveysDir, fileName);
  fs.writeFileSync(fileAbs, md);

  const added = appendBibliographyToSources(wiki.root_path, bundle.bibliography);
  console.error(`[survey] wrote ${fileAbs}`);
  console.error(`[survey] appended ${added} new bibliography rows to sources.md`);

  // Index via wiki-cli
  const wikiCli = path.join(PRO_WORKFLOW_ROOT, 'skills', 'wiki-builder', 'scripts', 'wiki-cli.js');
  const relPath = path.relative(wiki.root_path, fileAbs);
  try {
    execFileSync('node', [wikiCli, 'page', slug, relPath, '--type', 'survey'], { stdio: 'inherit' });
  } catch (e) {
    die(`wiki-cli page failed: ${e.message}`);
  }
  console.log(JSON.stringify({ slug, file: fileAbs, version: v, bibliography_added: added }, null, 2));
}

async function main() {
  const [, , ...rest] = process.argv;
  const args = parseArgs(rest);
  if (rest.length === 0 || args.help) {
    console.error('Usage: build-survey.js --bundle <path> --wiki <slug> [--provider anthropic|openai|openrouter|fireworks|custom] [--model id]');
    process.exit(1);
  }
  await cmdRun(args);
}

main().catch(e => { console.error(e); process.exit(1); });
