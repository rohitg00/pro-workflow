#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..');
const NO_EMBEDDING_PROVIDER = 'No embedding provider configured. Set an OpenAI or Voyage key in plugin settings, or PRO_WORKFLOW_OPENAI_API_KEY / PRO_WORKFLOW_VOYAGE_API_KEY for the standalone CLI.';

function getStore() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) { console.error('build store first'); process.exit(1); }
  return require(distPath).createStore();
}

function getEmbedHelpers() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'search', 'embeddings.js');
  if (!fs.existsSync(distPath)) { console.error('build embeddings first'); process.exit(1); }
  return require(distPath);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const n = argv[i+1]; if (n && !n.startsWith('--')) { out[k] = n; i++; } else out[k] = true; }
    else out._.push(a);
  }
  return out;
}

async function cmdAll(args) {
  const slug = args._[0];
  const helpers = getEmbedHelpers();
  const provider = helpers.getEmbeddingProvider();
  if (!provider) {
    console.error(NO_EMBEDDING_PROVIDER);
    process.exit(2);
  }
  const store = getStore();
  try {
    const pages = slug ? store.listWikiPages(slug) : store.db.prepare('SELECT * FROM wiki_pages').all();
    const limit = parseInt(args.limit, 10) || 200;
    const todo = [];
    for (const p of pages.slice(0, limit)) {
      const has = store.db.prepare('SELECT 1 FROM wiki_embeddings WHERE page_id = ? AND model = ?').get(p.id, `${provider.name}:${provider.model}`);
      if (has && !args.force) continue;
      todo.push(p);
    }
    if (!todo.length) { console.log(JSON.stringify({ embedded: 0, provider: `${provider.name}:${provider.model}`, message: 'all up-to-date' })); return; }
    console.error(`[embed] ${todo.length} pages → ${provider.name}:${provider.model}`);

    const batchSize = 16;
    let done = 0;
    for (let i = 0; i < todo.length; i += batchSize) {
      const batch = todo.slice(i, i + batchSize);
      const inputs = batch.map(p => `${p.title}\n\n${(p.content || '').slice(0, 8000)}`);
      const vectors = await provider.embed(inputs);
      for (let j = 0; j < batch.length; j++) {
        helpers.upsertEmbedding(store.db, batch[j].id, provider, vectors[j]);
        done++;
      }
      console.error(`[embed] ${done}/${todo.length}`);
    }
    console.log(JSON.stringify({ embedded: done, provider: `${provider.name}:${provider.model}` }));
  } finally { store.close(); }
}

async function cmdSearch(args) {
  const query = args._[0];
  if (!query) { console.error('search: query required'); process.exit(1); }
  const store = getStore();
  try {
    const limit = parseInt(args.limit, 10) || 10;
    if (args.mode === 'bm25') {
      const hits = store.searchWiki(query, { wikiSlug: args.wiki, limit, loose: true });
      console.log(JSON.stringify(hits, null, 2));
      return;
    }

    const helpers = getEmbedHelpers();
    const provider = helpers.getEmbeddingProvider();
    if (!provider) { console.error(NO_EMBEDDING_PROVIDER); process.exit(2); }
    const [qv] = await provider.embed([query]);
    const vectorHits = helpers.vectorSearch(store.db, qv, { wikiSlug: args.wiki, limit });
    if (args.mode === 'vector') {
      console.log(JSON.stringify(vectorHits, null, 2));
      return;
    }

    const bm25Hits = store.searchWiki(query, { wikiSlug: args.wiki, limit, loose: true });
    const fused = helpers.reciprocalRankFusion(
      [vectorHits.map(v => ({ page_id: v.page_id })), bm25Hits.map(h => ({ page_id: h.page_id }))],
      (x) => String(x.page_id),
    );
    const byId = new Map();
    for (const h of bm25Hits) byId.set(h.page_id, h);
    for (const v of vectorHits) if (!byId.has(v.page_id)) {
      const row = store.db.prepare('SELECT id AS page_id, wiki_slug, rel_path, title, summary FROM wiki_pages WHERE id = ?').get(v.page_id);
      if (row) byId.set(v.page_id, { ...row, rank: -v.similarity, snippet: '' });
    }
    const out = fused.slice(0, limit).map(f => ({ ...byId.get(parseInt(f.key, 10)), rrf_score: f.score }));
    console.log(JSON.stringify(out, null, 2));
  } finally { store.close(); }
}

function usage() {
  console.error(`Usage:
  embed-wiki.js all [<slug>] [--limit 200] [--force]
  embed-wiki.js search "<query>" [--wiki slug] [--limit 10] [--mode hybrid|vector|bm25]`);
  process.exit(1);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case 'all': await cmdAll(args); break;
    case 'search': await cmdSearch(args); break;
    default: usage();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
