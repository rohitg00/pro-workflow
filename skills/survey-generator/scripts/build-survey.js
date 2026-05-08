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

function postJSON(urlStr, body, headers) {
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
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const PROVIDER_DEFAULTS = {
  anthropic: { envKey: 'ANTHROPIC_API_KEY', baseUrl: 'https://api.anthropic.com', model: 'claude-opus-4-7' },
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
    const res = await postJSON(`${p.baseUrl}/v1/messages`, {
      model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }],
    }, { 'x-api-key': process.env[p.envKey], 'anthropic-version': '2023-06-01' });
    if (res.status >= 400) die(`anthropic error ${res.status}: ${res.body.slice(0, 300)}`);
    const data = JSON.parse(res.body);
    return (data.content || []).map(b => b.text || '').join('');
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

function appendBibliographyToSources(wikiRoot, bibliography) {
  const file = path.join(wikiRoot, 'sources.md');
  let existing = '';
  if (fs.existsSync(file)) existing = fs.readFileSync(file, 'utf8');
  const seenKeys = new Set();
  for (const m of existing.matchAll(/\| (src-bib-[a-z0-9-]+) \|/g)) seenKeys.add(m[1]);

  const newRows = [];
  for (const b of bibliography) {
    const id = `src-bib-${slugify(b.key)}`;
    if (seenKeys.has(id)) continue;
    const url = b.url || (b.venue && b.venue.startsWith('arXiv:') ? `https://arxiv.org/abs/${b.venue.slice(6)}` : '');
    newRows.push(`| ${id} | paper | ${url} | ${b.title.replace(/\|/g, '\\|')} | ${b.key} | ${new Date().toISOString().slice(0, 10)} |`);
  }
  if (!newRows.length) return 0;
  if (!existing.includes('| id | type |')) {
    fs.writeFileSync(file, existing + (existing.endsWith('\n') ? '' : '\n') + newRows.join('\n') + '\n');
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
  return `Compile a literature survey on the topic "${bundle.topic}" using ONLY the bibliography provided.

Output strict markdown:
- H1 = topic title
- Numbered H2 sections following the provided sections list
- Inline citations as [^${'<paper-key>'}] referencing entries from the bibliography
- A "## References" section at the end listing every cited [^key] with: key, authors, year, title, venue, one-sentence summary
- No HTML, no SVG, no inline images
- ~600-1200 words per section, scaled by bibliography size
- For each section, weave together the papers in section[].papers; do not just list them

Bibliography (USE THESE KEYS EXACTLY):
${JSON.stringify(bundle.bibliography, null, 2)}

Sections to produce in order:
${JSON.stringify(bundle.sections, null, 2)}

Anchor (context only, do not cite):
${bundle.anchor_source || ''}

Hard rules:
- Cite real papers from the bibliography only. Do not invent.
- Every section that lists papers MUST cite each one at least once.
- Use [^paper-key] for inline citations. The References section reuses these keys.
- Do not write any prose under the H1; start sections immediately.`;
}

async function cmdRun(args) {
  const bundlePath = args.bundle;
  const slug = args.wiki;
  if (!bundlePath || !slug) die('usage: build-survey.js --bundle <path> --wiki <slug> [--provider name] [--model id]');
  if (!fs.existsSync(bundlePath)) die(`bundle not found: ${bundlePath}`);

  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  if (!bundle.topic || !Array.isArray(bundle.bibliography)) die('bundle missing topic or bibliography[]');

  const providerName = pickProvider(args.provider);
  if (!providerName) die('no provider env var set');
  const model = args.model || PROVIDER_DEFAULTS[providerName].model;
  if (!model) die('no model — pass --model');

  const store = getStore();
  let wiki;
  try { wiki = store.getWiki(slug); } finally { store.close(); }
  if (!wiki) die(`unknown wiki: ${slug}`);

  console.error(`[survey] generating with ${providerName}:${model} for wiki ${slug}`);
  const md = await callProvider(providerName, model, 'You are a careful technical-writing assistant generating a literature survey.', buildPrompt(bundle), 16000);

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
    console.error('[survey] wiki-cli page failed:', e.message);
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
