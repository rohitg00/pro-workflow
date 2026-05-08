#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..', '..', '..');

function getStore() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) {
    console.error(`[wiki-query] built store missing at ${distPath}. Run: cd ${PRO_WORKFLOW_ROOT} && npm install && npm run build`);
    process.exit(1);
  }
  return require(distPath).createStore();
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
    } else {
      out._.push(a);
    }
  }
  return out;
}

function cmdSearch(args) {
  const query = args._[0];
  if (!query) { console.error('search: query required'); process.exit(1); }
  const limit = parseInt(args.limit, 10) || 10;
  const store = getStore();
  try {
    const hits = store.searchWiki(query, { wikiSlug: args.wiki, limit });
    if (args.json) {
      console.log(JSON.stringify(hits, null, 2));
    } else if (!hits.length) {
      console.log('(no matches)');
    } else {
      for (const h of hits) {
        console.log(`${h.wiki_slug} · ${h.rel_path}  [${h.rank.toFixed(2)}]`);
        console.log(`  ${h.title}`);
        if (h.snippet) console.log(`  ${h.snippet.replace(/\n/g, ' ')}`);
      }
    }
  } finally {
    store.close();
  }
}

function cmdRelated(args) {
  const slug = args._[0];
  const relPath = args._[1];
  if (!slug || !relPath) { console.error('related: slug and rel-path required'); process.exit(1); }
  const limit = parseInt(args.limit, 10) || 5;
  const store = getStore();
  try {
    const page = store.getWikiPage(slug, relPath);
    if (!page) { console.error(`page not found: ${slug}/${relPath}`); process.exit(1); }
    const seed = [page.title, page.summary].filter(Boolean).join(' ');
    const hits = store.searchWiki(seed, { wikiSlug: slug, limit: limit + 1 })
      .filter(h => h.rel_path !== relPath)
      .slice(0, limit);
    if (args.json) console.log(JSON.stringify(hits, null, 2));
    else if (!hits.length) console.log('(no related pages)');
    else hits.forEach(h => console.log(`${h.rel_path}  ${h.title}  [${h.rank.toFixed(2)}]`));
  } finally {
    store.close();
  }
}

function cmdShow(args) {
  const slug = args._[0];
  const relPath = args._[1];
  if (!slug || !relPath) { console.error('show: slug and rel-path required'); process.exit(1); }
  const store = getStore();
  try {
    const page = store.getWikiPage(slug, relPath);
    if (!page) { console.error('page not found'); process.exit(1); }
    if (args.json) console.log(JSON.stringify({ ...page, content: undefined, content_preview: page.content?.slice(0, 1000) }, null, 2));
    else console.log(page.content || '');
  } finally {
    store.close();
  }
}

function usage() {
  console.error(`Usage:
  query.js search "<query>" [--wiki <slug>] [--limit 10] [--json]
  query.js related <slug> <rel-path> [--limit 5] [--json]
  query.js show <slug> <rel-path> [--json]`);
  process.exit(1);
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case 'search': return cmdSearch(args);
    case 'related': return cmdRelated(args);
    case 'show': return cmdShow(args);
    default: usage();
  }
}

main();
