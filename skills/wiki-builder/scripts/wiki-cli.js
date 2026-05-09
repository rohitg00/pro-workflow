#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..', '..', '..');

function getStore() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) {
    die(`Built store missing at ${distPath}. Run: cd ${PRO_WORKFLOW_ROOT} && npm install && npm run build`);
  }
  const mod = require(distPath);
  if (typeof mod.createStore !== 'function') die('createStore not exported');
  return mod.createStore();
}

function die(msg) {
  console.error(`[wiki] ${msg}`);
  process.exit(1);
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

function defaultRoot(scope) {
  if (scope === 'project') {
    const proj = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    return path.join(proj, '.claude', 'wikis');
  }
  return process.env.WIKI_ROOT || path.join(os.homedir(), '.pro-workflow', 'wikis');
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function cmdInit(args) {
  const slug = args._[0];
  if (!slug) die('init: slug required');
  const title = args.title || slug;
  const flavor = args.flavor || 'research';
  const scope = args.scope || 'global';
  const root = args.root || defaultRoot(scope);

  const initSh = path.join(__dirname, 'init_wiki.sh');
  const dest = execFileSync('bash', [initSh, slug, '--title', title, '--flavor', flavor, '--scope', scope, '--root', root], { encoding: 'utf8' }).trim();

  const store = getStore();
  try {
    store.upsertWiki({ slug, title, flavor, root_path: dest, scope });
  } catch (e) {
    die(e.message);
  } finally {
    store.close();
  }
  console.log(JSON.stringify({ slug, title, flavor, scope, root_path: dest }, null, 2));
}

function cmdList(args) {
  const store = getStore();
  try {
    const wikis = store.listWikis(args.scope);
    if (args.json) { console.log(JSON.stringify(wikis, null, 2)); return; }
    if (!wikis.length) { console.log('(no wikis)'); return; }
    for (const w of wikis) {
      console.log(`${w.slug.padEnd(24)} ${w.flavor.padEnd(12)} ${w.scope.padEnd(8)} ${w.root_path}`);
    }
  } finally {
    store.close();
  }
}

function cmdInfo(args) {
  const slug = args._[0];
  if (!slug) die('info: slug required');
  const store = getStore();
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) die(`unknown wiki: ${slug}`);
    const pages = store.listWikiPages(slug);
    console.log(JSON.stringify({ wiki, page_count: pages.length, pages: pages.map(p => p.rel_path) }, null, 2));
  } finally {
    store.close();
  }
}

function cmdPage(args) {
  const slug = args._[0];
  const relPath = args._[1];
  if (!slug || !relPath) die('page: slug and rel-path required');

  const store = getStore();
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) die(`unknown wiki: ${slug}. Run: wiki-cli.js init ${slug} --title "..."`);

    const rootAbs = path.resolve(wiki.root_path);
    const fileAbs = path.resolve(wiki.root_path, relPath);
    if (fileAbs !== rootAbs && !fileAbs.startsWith(rootAbs + path.sep)) {
      die(`rel-path escapes wiki root: ${relPath}`);
    }
    let content = '';
    if (args['from-file']) {
      content = fs.readFileSync(args['from-file'], 'utf8');
      fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
      fs.writeFileSync(fileAbs, content);
    } else if (fs.existsSync(fileAbs)) {
      content = fs.readFileSync(fileAbs, 'utf8');
    } else {
      die(`page file does not exist: ${fileAbs}. Pass --from-file or write the file first.`);
    }

    const title = args.title || extractTitle(content) || path.basename(relPath, '.md');
    const summary = args.summary || extractSummary(content);
    const pageType = args.type || inferType(relPath);

    const row = store.upsertWikiPage({
      wiki_slug: slug,
      rel_path: relPath,
      title,
      summary,
      content,
      page_type: pageType,
      content_hash: sha256(content),
    });
    console.log(JSON.stringify({ id: row.id, wiki_slug: slug, rel_path: relPath, title, page_type: pageType }, null, 2));
  } finally {
    store.close();
  }
}

function cmdReindex(args) {
  const slug = args._[0];
  if (!slug) die('reindex: slug required');
  const store = getStore();
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) die(`unknown wiki: ${slug}`);
    const wikiDir = path.join(wiki.root_path, 'wiki');
    if (!fs.existsSync(wikiDir)) die(`no wiki/ folder at ${wikiDir}`);

    let count = 0;
    walk(wikiDir).forEach(abs => {
      if (!abs.endsWith('.md')) return;
      const rel = path.relative(wiki.root_path, abs);
      const content = fs.readFileSync(abs, 'utf8');
      store.upsertWikiPage({
        wiki_slug: slug,
        rel_path: rel,
        title: extractTitle(content) || path.basename(rel, '.md'),
        summary: extractSummary(content),
        content,
        page_type: inferType(rel),
        content_hash: sha256(content),
      });
      count++;
    });
    console.log(JSON.stringify({ slug, indexed: count }, null, 2));
  } finally {
    store.close();
  }
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function extractSummary(md) {
  const stripped = md.replace(/^---[\s\S]*?---\s*/m, '').replace(/^#.*\n/m, '').trim();
  const para = stripped.split(/\n\n/)[0] || '';
  return para.slice(0, 500) || null;
}

function inferType(relPath) {
  const parts = relPath.split(path.sep);
  if (parts[0] === 'wiki' && parts.length >= 3) return parts[1].replace(/s$/, '');
  return null;
}

function usage() {
  console.error(`Usage:
  wiki-cli.js init <slug> --title "X" [--flavor research] [--scope global|project] [--root path]
  wiki-cli.js list [--scope global|project] [--json]
  wiki-cli.js info <slug>
  wiki-cli.js page <slug> <rel-path> [--title "X"] [--type concept|paper|...] [--from-file path]
  wiki-cli.js reindex <slug>`);
  process.exit(1);
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case 'init': return cmdInit(args);
    case 'list': return cmdList(args);
    case 'info': return cmdInfo(args);
    case 'page': return cmdPage(args);
    case 'reindex': return cmdReindex(args);
    default: usage();
  }
}

main();
