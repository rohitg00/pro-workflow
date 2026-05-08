#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..', '..', '..');
const SKILL_ROOT = path.resolve(__dirname, '..');
const STOP_FILE = path.join(os.homedir(), '.pro-workflow', 'STOP');

function getStore() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) {
    die(`built store missing at ${distPath}. Run: cd ${PRO_WORKFLOW_ROOT} && npm install && npm run build`);
  }
  return require(distPath).createStore();
}

function die(msg) { console.error(`[research-loop] ${msg}`); process.exit(1); }
function log(msg) { console.error(`[research-loop] ${msg}`); }

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

function loadFetchers(names) {
  const fetchers = {};
  const dirs = [
    path.join(SKILL_ROOT, 'scripts', 'source-fetchers'),
    path.join(os.homedir(), '.pro-workflow', 'fetchers'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.js')) continue;
      const name = path.basename(f, '.js');
      if (names && !names.includes(name)) continue;
      try {
        fetchers[name] = require(path.join(dir, f));
      } catch (e) {
        log(`failed to load fetcher ${name}: ${e.message}`);
      }
    }
  }
  return fetchers;
}

function readWikiConfig(rootPath) {
  const cfgPath = path.join(rootPath, 'wiki.config.md');
  if (!fs.existsSync(cfgPath)) return {};
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const obj = {};
  let nested = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indent = line.match(/^(\s*)/)[1].length;
    const trimmed = line.trim();
    const kv = trimmed.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const k = kv[1], v = kv[2];
    if (indent === 0) {
      if (v === '') { obj[k] = {}; nested = obj[k]; }
      else { obj[k] = parseScalar(v); nested = null; }
    } else if (nested) {
      nested[k] = parseScalar(v);
    }
  }
  return obj;
}

function parseScalar(v) {
  if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function tokenize(text) {
  return new Set((text.toLowerCase().match(/[a-z0-9_]{4,}/g) || []));
}

function jaccardNovelty(newText, prevTexts) {
  const a = tokenize(newText);
  if (a.size === 0) return 1;
  const b = new Set();
  for (const p of prevTexts) tokenize(p).forEach(t => b.add(t));
  if (b.size === 0) return 1;
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap++;
  return 1 - (overlap / a.size);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page';
}

function compilePage(seed, docs, prevPages) {
  const claims = [];
  const seen = new Set();
  for (const d of docs) {
    const text = d.content || '';
    for (const sentence of text.split(/(?<=[.!?])\s+/).slice(0, 8)) {
      const trimmed = sentence.trim();
      if (trimmed.length < 40 || trimmed.length > 400) continue;
      const key = trimmed.toLowerCase().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push({ text: trimmed, source: d.url || d.title || 'unknown' });
    }
  }
  if (!claims.length) return null;

  const novelty = jaccardNovelty(claims.map(c => c.text).join(' '), prevPages.map(p => p.content || ''));

  const lines = [];
  lines.push(`# ${seed.query}`);
  lines.push('');
  lines.push(`> seed-${seed.id} · depth ${seed.depth} · novelty ${(novelty * 100).toFixed(0)}%`);
  lines.push('');
  lines.push('## Sources');
  lines.push('');
  for (const d of docs) {
    lines.push(`- [${d.title || d.url}](${d.url || ''})`);
  }
  lines.push('');
  lines.push('## Claims');
  lines.push('');
  for (const [i, c] of claims.entries()) {
    lines.push(`- ${c.text} [^src-${i + 1}]`);
  }
  lines.push('');
  lines.push('## Open follow-ups');
  lines.push('');
  lines.push('_Auto-extracted; review and prune._');

  return { content: lines.join('\n'), claims, novelty };
}

function deriveFollowUps(seed, page) {
  const queries = new Set();
  for (const c of page.claims) {
    const m = c.text.match(/\b([A-Z][a-zA-Z]{3,})\b/g);
    if (m) for (const term of m.slice(0, 2)) queries.add(`${term} in ${seed.query}`);
  }
  return Array.from(queries).slice(0, 3);
}

async function runOne(slug, args) {
  if (fs.existsSync(STOP_FILE)) {
    log('STOP file present — aborting');
    return { halted: 'kill-switch' };
  }
  const store = getStore();
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) die(`unknown wiki: ${slug}`);
    const cfg = readWikiConfig(wiki.root_path);
    const auto = cfg.auto_research || {};
    const enabled = !!(auto.enabled || args.force);
    if (!enabled) { log(`auto_research.enabled is false in ${slug}/wiki.config.md (use --force to override)`); return { halted: 'disabled' }; }

    const isPrivate = !!(cfg.private);
    const fetcherNames = (args.fetchers ? String(args.fetchers).split(',') : auto.fetchers) || ['web', 'arxiv', 'github'];
    if (isPrivate && fetcherNames.some(n => n !== 'local')) {
      log(`wiki ${slug} is private — refusing non-local fetchers`);
      return { halted: 'private' };
    }

    const maxPages = parseInt(args['max-pages'] || process.env.WIKI_LOOP_MAX_PAGES || auto.max_pages_per_run || 5, 10);
    const maxDepth = parseInt(args['max-depth'] || process.env.WIKI_LOOP_MAX_DEPTH || auto.max_depth || 3, 10);
    const budget = parseFloat(args['budget-usd'] || process.env.WIKI_LOOP_BUDGET_USD || auto.budget_usd || 0.50);

    const fetchers = loadFetchers(fetcherNames);
    if (Object.keys(fetchers).length === 0) die(`no usable fetchers among: ${fetcherNames.join(',')}`);

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(wiki.root_path, 'logs', `research-${ts}.md`);
    const stats = { slug, started: ts, pages: 0, cost_usd: 0, halted: null, log: [] };
    fs.mkdirSync(path.dirname(logFile), { recursive: true });

    const prevPages = store.listWikiPages(slug);
    let convergeStreak = 0;

    while (stats.pages < maxPages) {
      if (fs.existsSync(STOP_FILE)) { stats.halted = 'kill-switch'; break; }
      const seed = store.claimPendingSeed(slug);
      if (!seed) { stats.halted = 'queue-empty'; break; }
      if (seed.depth > maxDepth) { store.setSeedStatus(seed.id, 'done'); continue; }

      let finalStatus = 'done';
      let shouldBreak = false;
      try {
        const docs = [];
        for (const [name, fetcher] of Object.entries(fetchers)) {
          try {
            if (!fetcher.match(seed.query)) continue;
            const cost = fetcher.estimateCost ? fetcher.estimateCost(seed.query) : { usd: 0 };
            if (stats.cost_usd + (cost.usd || 0) > budget) {
              stats.halted = 'budget';
              finalStatus = 'pending';
              shouldBreak = true;
              break;
            }
            const hits = await fetcher.fetch(seed.query, { limit: 3 });
            docs.push(...hits);
            stats.cost_usd += cost.usd || 0;
            stats.log.push(`[${new Date().toISOString()}] seed-${seed.id} fetcher=${name} hits=${hits.length}`);
          } catch (e) {
            stats.log.push(`[${new Date().toISOString()}] seed-${seed.id} fetcher=${name} ERROR ${e.message}`);
          }
        }
        if (shouldBreak) continue;

        const compiled = compilePage(seed, docs, prevPages);
        if (!compiled) {
          finalStatus = 'failed';
          stats.log.push(`[${new Date().toISOString()}] seed-${seed.id} no usable claims`);
          continue;
        }

        const relPath = path.join('wiki', 'questions', `${slugify(seed.query)}.md`);
        const fileAbs = path.join(wiki.root_path, relPath);
        fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
        fs.writeFileSync(fileAbs, compiled.content);

        const row = store.upsertWikiPage({
          wiki_slug: slug,
          rel_path: relPath,
          title: seed.query,
          summary: compiled.content.slice(0, 500),
          content: compiled.content,
          page_type: 'question',
          content_hash: crypto.createHash('sha256').update(compiled.content).digest('hex').slice(0, 16),
        });
        prevPages.push(row);
        stats.pages++;
        stats.log.push(`[${new Date().toISOString()}] seed-${seed.id} compiled ${relPath} novelty=${compiled.novelty.toFixed(2)}`);

        if (compiled.novelty < 0.05) convergeStreak++;
        else convergeStreak = 0;
        if (convergeStreak >= 3) { stats.halted = 'converged'; shouldBreak = true; }

        const followUps = deriveFollowUps(seed, compiled);
        for (const q of followUps) {
          if (seed.depth + 1 > maxDepth) continue;
          store.enqueueSeed({ wiki_slug: slug, query: q, parent_id: seed.id, depth: seed.depth + 1 });
        }
      } catch (e) {
        finalStatus = 'failed';
        stats.log.push(`[${new Date().toISOString()}] seed-${seed.id} ERROR ${e.message}`);
      } finally {
        store.setSeedStatus(seed.id, finalStatus);
      }
      if (shouldBreak) break;
    }

    fs.writeFileSync(logFile, ['# Research run ' + ts, '', ...stats.log].join('\n'));
    const derivedDir = path.join(wiki.root_path, 'derived');
    fs.mkdirSync(derivedDir, { recursive: true });
    fs.writeFileSync(path.join(derivedDir, `run-${ts}.json`), JSON.stringify(stats, null, 2));
    return stats;
  } finally {
    store.close();
  }
}

function cmdSeed(args) {
  const slug = args._[0];
  const query = args._[1];
  if (!slug || !query) die('seed: slug and query required');
  const store = getStore();
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) die(`unknown wiki: ${slug}`);
    const seed = store.enqueueSeed({
      wiki_slug: slug,
      query,
      depth: parseInt(args.depth, 10) || 0,
      parent_id: args['parent-id'] ? parseInt(args['parent-id'], 10) : null,
    });
    console.log(JSON.stringify(seed, null, 2));
  } finally { store.close(); }
}

function cmdSeeds(args) {
  const slug = args._[0];
  if (!slug) die('seeds: slug required');
  const store = getStore();
  try {
    const status = args.status;
    const where = status ? `WHERE wiki_slug = ? AND status = ?` : `WHERE wiki_slug = ?`;
    const stmt = store.db.prepare(`SELECT * FROM wiki_seeds ${where} ORDER BY depth ASC, created_at ASC`);
    const rows = status ? stmt.all(slug, status) : stmt.all(slug);
    console.log(JSON.stringify(rows, null, 2));
  } finally { store.close(); }
}

function cmdCancel(args) {
  const slug = args._[0];
  if (!slug) die('cancel: slug required');
  const store = getStore();
  try {
    const stmt = store.db.prepare(`UPDATE wiki_seeds SET status='failed' WHERE wiki_slug=? AND status IN ('pending','active')`);
    const r = stmt.run(slug);
    console.log(JSON.stringify({ slug, cancelled: r.changes }, null, 2));
  } finally { store.close(); }
}

function cmdStatus() {
  const store = getStore();
  try {
    const rows = store.db.prepare(`
      SELECT wiki_slug,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed
      FROM wiki_seeds GROUP BY wiki_slug
    `).all();
    console.log(JSON.stringify({ kill_switch: fs.existsSync(STOP_FILE), wikis: rows }, null, 2));
  } finally { store.close(); }
}

async function cmdRun(args) {
  const slug = args._[0];
  if (!slug) die('run: slug required');
  const stats = await runOne(slug, args);
  console.log(JSON.stringify(stats, null, 2));
}

function usage() {
  console.error(`Usage:
  research-loop.js run <slug> [--max-pages 5] [--max-depth 3] [--budget-usd 0.50] [--fetchers web,arxiv,github] [--force]
  research-loop.js seed <slug> "<query>" [--depth 0] [--parent-id N]
  research-loop.js seeds <slug> [--status pending|active|done|failed]
  research-loop.js cancel <slug>
  research-loop.js status`);
  process.exit(1);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case 'run': await cmdRun(args); break;
    case 'seed': cmdSeed(args); break;
    case 'seeds': cmdSeeds(args); break;
    case 'cancel': cmdCancel(args); break;
    case 'status': cmdStatus(); break;
    default: usage();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
