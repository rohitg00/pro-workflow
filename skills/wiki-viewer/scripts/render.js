#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const PRO_WORKFLOW_ROOT = path.resolve(__dirname, '..', '..', '..');

function getStore() {
  const distPath = path.join(PRO_WORKFLOW_ROOT, 'dist', 'db', 'store.js');
  if (!fs.existsSync(distPath)) {
    console.error(`[wiki-viewer] built store missing at ${distPath}. Run: cd ${PRO_WORKFLOW_ROOT} && npm install && npm run build`);
    process.exit(1);
  }
  return require(distPath).createStore();
}

function die(msg) { console.error(`[wiki-viewer] ${msg}`); process.exit(1); }

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

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false;
  let inList = false;
  let inTable = false;
  let codeLang = '';
  let para = [];

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim();
    if (text) out.push(`<p>${inline(text)}</p>`);
    para = [];
  };
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const closeTable = () => { if (inTable) { out.push('</tbody></table>'); inTable = false; } };

  function inline(s) {
    let r = escapeHtml(s);
    r = r.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    r = r.replace(/(?<![*])\*(?!\*)([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    r = r.replace(/\[\^([a-zA-Z0-9_-]+)\]/g, (_, id) => `<a class="cite" href="#src-row-${escapeHtml(id)}" data-src-id="${escapeHtml(id)}">[${escapeHtml(id)}]</a>`);
    r = r.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (_, t, u) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener">${t}</a>`);
    return r;
  }

  for (const raw of lines) {
    const line = raw;
    const codeFence = line.match(/^```(\w*)\s*$/);
    if (codeFence) {
      flushPara(); closeList(); closeTable();
      if (inCode) { out.push('</code></pre>'); inCode = false; codeLang = ''; }
      else { inCode = true; codeLang = codeFence[1] || ''; out.push(`<pre><code data-lang="${escapeHtml(codeLang)}">`); }
      continue;
    }
    if (inCode) { out.push(escapeHtml(line)); continue; }

    if (/^\s*$/.test(line)) { flushPara(); closeList(); closeTable(); continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushPara(); closeList(); closeTable();
      const lvl = heading[1].length;
      out.push(`<h${lvl}>${inline(heading[2])}</h${lvl}>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushPara(); closeTable();
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara(); closeList();
      if (!inTable) {
        out.push('<table><thead><tr>');
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        for (const c of cells) out.push(`<th>${inline(c)}</th>`);
        out.push('</tr></thead><tbody>');
        inTable = true;
        continue;
      }
      if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      out.push('<tr>');
      for (const c of cells) out.push(`<td>${inline(c)}</td>`);
      out.push('</tr>');
      continue;
    } else { closeTable(); }

    if (/^>\s+/.test(line)) {
      flushPara(); closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s+/, ''))}</blockquote>`);
      continue;
    }

    para.push(line);
  }
  flushPara();
  closeList();
  closeTable();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

function buildLinkGraph(pages) {
  const ids = new Map(pages.map(p => [p.rel_path, p.id]));
  const titleById = new Map(pages.map(p => [p.id, p.title]));
  const edges = [];
  const linkRe = /\[[^\]]+\]\(([^)]+\.md)(?:#[^)]*)?\)/g;
  for (const p of pages) {
    if (!p.content) continue;
    let m;
    while ((m = linkRe.exec(p.content)) !== null) {
      const target = m[1];
      const candidate = target.startsWith('/') ? target.slice(1) : target;
      const direct = ids.get(candidate);
      if (direct && direct !== p.id) {
        edges.push({ from: p.id, to: direct });
        continue;
      }
      for (const [rel, otherId] of ids) {
        if (rel.endsWith('/' + target) || rel.endsWith(target)) {
          if (otherId !== p.id) edges.push({ from: p.id, to: otherId });
          break;
        }
      }
    }
  }
  return { nodes: pages.map(p => ({ id: p.id, title: p.title, type: p.page_type || 'other' })), edges, titleById };
}

function svgGraph(graph, width = 720, height = 420) {
  const { nodes, edges } = graph;
  if (!nodes.length) return '<div class="empty">No pages to graph.</div>';

  const radius = Math.min(width, height) / 2 - 60;
  const cx = width / 2;
  const cy = height / 2;
  const positions = new Map();
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    positions.set(n.id, { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  });

  const edgeSvg = edges.map(e => {
    const a = positions.get(e.from); const b = positions.get(e.to);
    if (!a || !b) return '';
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" class="edge"/>`;
  }).join('');

  const nodeSvg = nodes.map(n => {
    const p = positions.get(n.id);
    const safeTitle = escapeHtml(n.title.length > 28 ? n.title.slice(0, 27) + '…' : n.title);
    return `<g class="node" data-page-id="${n.id}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" class="node-${escapeHtml(n.type)}"/><title>${escapeHtml(n.title)}</title><text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="middle">${safeTitle}</text></g>`;
  }).join('');

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="graph">${edgeSvg}${nodeSvg}</svg>`;
}

function readSourcesMd(rootPath) {
  const file = path.join(rootPath, 'sources.md');
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  const rows = [];
  const re = /^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const id = m[1].trim();
    if (id === 'id' || /^-+$/.test(id)) continue;
    rows.push({ id, type: m[2].trim(), url: m[3].trim(), title: m[4].trim() });
  }
  return rows;
}

function indexLine(content) {
  const lines = (content || '').toLowerCase().split(/\s+/).filter(t => t.length >= 3 && t.length <= 24).slice(0, 200);
  return [...new Set(lines)].join(' ');
}

function buildHtml(opts) {
  const { wiki, pages, sources, seeds, learnings, embedCount, theme } = opts;
  const graph = buildLinkGraph(pages);
  const seedsByStatus = { pending: [], active: [], done: [], failed: [] };
  for (const s of seeds) (seedsByStatus[s.status] || (seedsByStatus[s.status] = [])).push(s);

  const pageJson = pages.map(p => ({
    id: p.id,
    rel_path: p.rel_path,
    title: p.title,
    summary: p.summary || '',
    type: p.page_type || 'other',
    updated_at: p.updated_at,
    html: renderMarkdown(p.content || ''),
    search_blob: indexLine(`${p.title} ${p.summary || ''} ${p.content || ''}`),
  }));

  const sourceJson = sources.map(s => ({ id: s.id, type: s.type || 'paper', url: s.url || '', title: s.title || '' }));

  const themeVars = theme === 'light'
    ? `--bg:#fafaf8;--fg:#1a1a2e;--muted:#6b7280;--card:#ffffff;--border:#e5e5e0;--accent:#D97757;--accent-text:#ffffff;--code-bg:#f3f4f6;--cite-bg:#fff5f0;`
    : `--bg:#0a0a0f;--fg:#f4f4f4;--muted:#9ca3af;--card:#15151c;--border:#26262e;--accent:#D97757;--accent-text:#000000;--code-bg:#0d0d12;--cite-bg:#2a1a14;`;

  const groupCount = {};
  for (const p of pages) {
    const t = p.page_type || 'other';
    groupCount[t] = (groupCount[t] || 0) + 1;
  }
  const groupChips = Object.entries(groupCount)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span class="chip" data-filter="${escapeHtml(t)}">${escapeHtml(t)} <em>${n}</em></span>`).join('');

  const sidebarItems = pages.map(p => `
    <li class="page-item" data-page-id="${p.id}" data-type="${escapeHtml(p.page_type || 'other')}" data-search="${escapeHtml(p.search_blob)}">
      <button class="page-btn">
        <span class="page-title">${escapeHtml(p.title)}</span>
        <span class="page-meta"><span class="type">${escapeHtml(p.page_type || 'other')}</span></span>
      </button>
    </li>`).join('');

  const sourcesTable = (() => {
    if (!sources.length) return '<div class="empty">No sources recorded.</div>';
    const rows = sources.map(s => `
      <tr id="src-row-${escapeHtml(s.id)}">
        <td class="mono">${escapeHtml(s.id)}</td>
        <td>${escapeHtml(s.type || 'paper')}</td>
        <td>${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.url)}</a>` : ''}</td>
        <td>${escapeHtml(s.title || '')}</td>
      </tr>`).join('');
    return `<table class="src-table"><thead><tr><th>id</th><th>type</th><th>url</th><th>title</th></tr></thead><tbody>${rows}</tbody></table>`;
  })();

  const seedsTable = Object.entries(seedsByStatus).map(([status, list]) => {
    if (!list.length) return '';
    const rows = list.map(s => {
      const cmd = `node skills/wiki-research-loop/scripts/research-loop.js seed ${wiki.slug} ${JSON.stringify(s.query)}`;
      return `<tr>
        <td class="mono">${s.id}</td>
        <td>${escapeHtml(s.query)}</td>
        <td class="mono">${s.depth}</td>
        <td class="mono">${escapeHtml(s.created_at)}</td>
        <td>${status === 'pending' ? `<button class="copy-btn" data-copy="${escapeHtml(cmd)}">Copy as command</button>` : ''}</td>
      </tr>`;
    }).join('');
    return `<details ${status === 'pending' || status === 'active' ? 'open' : ''}><summary>${status} (${list.length})</summary>
      <table class="seed-table"><thead><tr><th>id</th><th>query</th><th>depth</th><th>created</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    </details>`;
  }).filter(Boolean).join('') || '<div class="empty">No seeds queued.</div>';

  const learnRows = learnings.map(l => `
    <tr><td class="mono">${l.id}</td><td>${escapeHtml(l.category)}</td><td>${escapeHtml(l.rule)}</td><td>${escapeHtml(l.created_at)}</td></tr>
  `).join('') || '<tr><td colspan="4" class="empty">No wiki-scoped learnings.</td></tr>';

  return `<!doctype html>
<html lang="en" data-theme="${escapeHtml(theme)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="generator" content="pro-workflow wiki-viewer"/>
<title>${escapeHtml(wiki.title)} — wiki viewer</title>
<style>
  :root{ ${themeVars} }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}
  .mono{font-family:ui-monospace,SFMono-Regular,"JetBrains Mono",Menlo,monospace;font-variant-numeric:tabular-nums}
  header{padding:20px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  header .title{font-weight:800;font-size:18px}
  header .slug{color:var(--muted);font-size:12px}
  header .meta{display:flex;gap:14px;font-size:11px;color:var(--muted);flex-wrap:wrap;margin-left:auto}
  header .meta b{color:var(--fg);font-weight:700}
  .layout{display:grid;grid-template-columns:280px 1fr;gap:0;min-height:calc(100vh - 60px)}
  aside{border-right:1px solid var(--border);padding:14px;overflow:auto;max-height:calc(100vh - 60px);position:sticky;top:60px}
  aside h3{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
  .filter-input{width:100%;padding:8px 10px;background:var(--card);border:1px solid var(--border);color:var(--fg);font-size:13px;border-radius:4px}
  .chips{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}
  .chip{font-size:10px;padding:2px 6px;border:1px solid var(--border);border-radius:999px;cursor:pointer;color:var(--muted)}
  .chip em{font-style:normal;color:var(--fg);margin-left:3px}
  .chip.active{background:var(--accent);color:var(--accent-text);border-color:var(--accent)}
  ul.pages{list-style:none;padding:0;margin:0}
  ul.pages li{margin:0}
  .page-btn{width:100%;text-align:left;padding:8px 10px;background:transparent;border:0;color:var(--fg);cursor:pointer;border-radius:4px;display:flex;flex-direction:column;gap:2px;font-size:13px;font-family:inherit}
  .page-btn:hover{background:var(--card)}
  .page-btn.active{background:var(--accent);color:var(--accent-text)}
  .page-btn .page-title{font-weight:600}
  .page-btn .page-meta{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
  .page-btn.active .page-meta{color:var(--accent-text);opacity:0.85}
  main{padding:24px 32px;max-width:1100px;overflow:auto}
  main h1{font-size:28px;margin:0 0 4px}
  main h2{font-size:20px;margin:24px 0 8px;border-bottom:1px solid var(--border);padding-bottom:4px}
  main h3{font-size:16px;margin:18px 0 6px}
  main p{margin:8px 0}
  main code{background:var(--code-bg);padding:1px 5px;border-radius:3px;font-size:13px}
  main pre{background:var(--code-bg);padding:12px;border-radius:6px;overflow:auto;font-size:12px;border:1px solid var(--border)}
  main pre code{background:transparent;padding:0;font-size:inherit}
  main blockquote{border-left:3px solid var(--accent);padding:4px 12px;color:var(--muted);margin:12px 0}
  main table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0}
  main th,main td{border:1px solid var(--border);padding:6px 8px;text-align:left}
  main th{background:var(--card)}
  .cite{background:var(--cite-bg);color:var(--accent);padding:1px 5px;border-radius:3px;text-decoration:none;font-family:ui-monospace,monospace;font-size:11px;border:1px solid var(--accent)}
  .cite:hover{background:var(--accent);color:var(--accent-text)}
  details{border:1px solid var(--border);border-radius:6px;margin:8px 0;padding:8px 12px;background:var(--card)}
  details summary{cursor:pointer;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
  .src-table,.seed-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  .src-table th,.src-table td,.seed-table th,.seed-table td{border:1px solid var(--border);padding:6px 8px;text-align:left}
  .src-table th,.seed-table th{background:var(--bg);font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
  .copy-btn{background:var(--accent);color:var(--accent-text);border:0;padding:4px 10px;border-radius:3px;font-size:11px;cursor:pointer;font-family:inherit}
  .copy-btn:hover{opacity:0.9}
  .copy-btn.copied{background:#22c55e}
  .graph{width:100%;background:var(--card);border:1px solid var(--border);border-radius:6px}
  .graph .edge{stroke:var(--border);stroke-width:1}
  .graph circle{fill:var(--accent);stroke:var(--bg);stroke-width:2;cursor:pointer}
  .graph text{fill:var(--muted);font-size:9px;font-family:ui-monospace,monospace}
  .empty{color:var(--muted);font-size:13px;padding:12px;text-align:center}
  .pill{display:inline-block;padding:2px 6px;border:1px solid var(--border);border-radius:999px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}
  .pill.ok{color:#22c55e;border-color:#22c55e}
  .pill.warn{color:#f59e0b;border-color:#f59e0b}
  footer{padding:16px 28px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
  footer a{color:var(--accent)}
  @media print{aside{display:none}.layout{grid-template-columns:1fr}main{max-width:none}}
  @media (max-width:900px){.layout{grid-template-columns:1fr}aside{position:static;max-height:none;border-right:0;border-bottom:1px solid var(--border)}}
</style>
</head>
<body>
<header>
  <div>
    <div class="title">${escapeHtml(wiki.title)}</div>
    <div class="slug mono">${escapeHtml(wiki.slug)} · ${escapeHtml(wiki.flavor)} · ${escapeHtml(wiki.scope)}</div>
  </div>
  <div class="meta">
    <span><b>${pages.length}</b> pages</span>
    <span><b>${sources.length}</b> sources</span>
    <span><b>${seeds.length}</b> seeds</span>
    ${embedCount ? `<span><b>${embedCount}</b> embeddings</span>` : ''}
    <span class="mono">${escapeHtml(wiki.root_path)}</span>
  </div>
</header>

<div class="layout">
  <aside>
    <input class="filter-input" id="filter" type="text" placeholder="Filter pages…" autocomplete="off"/>
    <div class="chips" id="chips">
      <span class="chip active" data-filter="">all <em>${pages.length}</em></span>
      ${groupChips}
    </div>
    <h3>Pages</h3>
    <ul class="pages" id="pages">
      ${sidebarItems || '<li class="empty">No pages indexed.</li>'}
    </ul>
    <h3>Sections</h3>
    <ul class="pages">
      <li><button class="page-btn" data-section="overview">Overview</button></li>
      <li><button class="page-btn" data-section="sources">Sources (${sources.length})</button></li>
      <li><button class="page-btn" data-section="seeds">Seed queue (${seeds.length})</button></li>
      <li><button class="page-btn" data-section="graph">Link graph</button></li>
      <li><button class="page-btn" data-section="learnings">Wiki learnings (${learnings.length})</button></li>
    </ul>
  </aside>

  <main id="main">
    <section data-pane="overview">
      <h1>${escapeHtml(wiki.title)}</h1>
      <p class="mono" style="color:var(--muted);font-size:12px">${escapeHtml(wiki.flavor)} · ${escapeHtml(wiki.scope)} · created ${escapeHtml(wiki.created_at)}</p>
      <h2>At a glance</h2>
      <table>
        <tr><td>Slug</td><td class="mono">${escapeHtml(wiki.slug)}</td></tr>
        <tr><td>Root</td><td class="mono">${escapeHtml(wiki.root_path)}</td></tr>
        <tr><td>Pages</td><td>${pages.length}</td></tr>
        <tr><td>Sources</td><td>${sources.length}</td></tr>
        <tr><td>Seeds</td><td>${seeds.length} (pending: ${seedsByStatus.pending.length}, active: ${seedsByStatus.active.length}, done: ${seedsByStatus.done.length}, failed: ${seedsByStatus.failed.length})</td></tr>
        <tr><td>Embeddings</td><td>${embedCount}</td></tr>
        <tr><td>Auto-research</td><td>${wiki.auto_research ? '<span class="pill ok">enabled</span>' : '<span class="pill">opt-in</span>'}</td></tr>
        <tr><td>Privacy</td><td>${wiki.private ? '<span class="pill warn">private</span>' : '<span class="pill">public</span>'}</td></tr>
      </table>
      <h2>Type breakdown</h2>
      <p>${Object.entries(groupCount).map(([t, n]) => `<span class="pill">${escapeHtml(t)}: ${n}</span>`).join(' ') || '<span class="empty">No pages yet.</span>'}</p>
    </section>

    <section data-pane="page" hidden>
      <div id="page-body"></div>
    </section>

    <section data-pane="sources" hidden>
      <h2>Sources</h2>
      ${sourcesTable}
    </section>

    <section data-pane="seeds" hidden>
      <h2>Seed queue</h2>
      ${seedsTable}
    </section>

    <section data-pane="graph" hidden>
      <h2>Page link graph</h2>
      <p class="mono" style="color:var(--muted);font-size:12px">${graph.edges.length} link${graph.edges.length === 1 ? '' : 's'} between ${graph.nodes.length} pages.</p>
      ${svgGraph(graph)}
    </section>

    <section data-pane="learnings" hidden>
      <h2>Wiki-scoped learnings</h2>
      <table class="src-table">
        <thead><tr><th>id</th><th>category</th><th>rule</th><th>created</th></tr></thead>
        <tbody>${learnRows}</tbody>
      </table>
    </section>
  </main>
</div>

<footer>
  <div>Generated by <b>pro-workflow wiki-viewer</b> · ${new Date().toISOString().slice(0, 19).replace('T', ' ')}Z</div>
  <div>Single-file artifact · safe to share via S3 or any static host</div>
</footer>

<script>
  const PAGES = ${JSON.stringify(pageJson).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')};
  const SOURCES = ${JSON.stringify(sourceJson).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')};
  const PAGES_BY_ID = Object.fromEntries(PAGES.map(p => [p.id, p]));

  const filterInput = document.getElementById('filter');
  const chipsEl = document.getElementById('chips');
  const pagesUl = document.getElementById('pages');
  const main = document.getElementById('main');

  let activeFilter = '';
  let activeQuery = '';

  function applyFilter() {
    const items = pagesUl.querySelectorAll('.page-item');
    items.forEach(li => {
      const type = li.dataset.type;
      const blob = li.dataset.search;
      const title = li.querySelector('.page-title').textContent.toLowerCase();
      const passType = !activeFilter || type === activeFilter;
      const passQuery = !activeQuery || blob.includes(activeQuery) || title.includes(activeQuery);
      li.style.display = passType && passQuery ? '' : 'none';
    });
  }

  filterInput.addEventListener('input', () => {
    activeQuery = filterInput.value.toLowerCase().trim();
    applyFilter();
  });

  chipsEl.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    chipsEl.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter || '';
    applyFilter();
  });

  function showPane(name) {
    main.querySelectorAll('section').forEach(s => s.hidden = s.dataset.pane !== name);
  }

  function renderPage(pageId) {
    const page = PAGES_BY_ID[pageId];
    if (!page) return;
    document.querySelectorAll('.page-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.page-item[data-page-id="' + pageId + '"] .page-btn');
    if (btn) btn.classList.add('active');
    document.getElementById('page-body').innerHTML =
      '<h1>' + escapeText(page.title) + '</h1>' +
      '<p class="mono" style="color:var(--muted);font-size:12px">' + escapeText(page.type) + ' · ' + escapeText(page.rel_path) + ' · updated ' + escapeText(page.updated_at) + '</p>' +
      page.html;
    showPane('page');
    main.scrollTo({ top: 0, behavior: 'instant' });
  }

  function escapeText(s) {
    const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML;
  }

  pagesUl.addEventListener('click', e => {
    const item = e.target.closest('.page-item');
    if (item) { renderPage(parseInt(item.dataset.pageId, 10)); return; }
  });

  document.querySelectorAll('aside .page-btn[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showPane(btn.dataset.section));
  });

  document.addEventListener('click', e => {
    const node = e.target.closest('.graph .node');
    if (node) { renderPage(parseInt(node.dataset.pageId, 10)); return; }
    const cite = e.target.closest('.cite');
    if (cite) {
      const targetId = cite.dataset.srcId;
      showPane('sources');
      requestAnimationFrame(() => {
        const row = document.getElementById('src-row-' + targetId);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.style.transition = 'background-color 600ms';
          row.style.backgroundColor = 'var(--cite-bg)';
          setTimeout(() => { row.style.backgroundColor = ''; }, 1200);
        }
      });
      e.preventDefault();
      return;
    }
    const copy = e.target.closest('.copy-btn');
    if (copy) {
      const text = copy.dataset.copy;
      navigator.clipboard?.writeText(text).then(() => {
        copy.classList.add('copied');
        const old = copy.textContent;
        copy.textContent = 'Copied';
        setTimeout(() => { copy.classList.remove('copied'); copy.textContent = old; }, 1500);
      });
    }
  });
</script>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args._[0];
  if (!slug) die('usage: render.js <slug> [--out <path>] [--theme dark|light]');

  const theme = args.theme === 'light' ? 'light' : 'dark';
  const store = getStore();
  let html;
  try {
    const wiki = store.getWiki(slug);
    if (!wiki) die(`unknown wiki: ${slug}`);

    const pages = store.listWikiPages(slug);
    const sourcesDb = store.db.prepare(`SELECT id, url, title, fetcher AS type FROM wiki_sources WHERE wiki_slug = ? ORDER BY id`).all(slug);
    const sourcesMd = readSourcesMd(wiki.root_path);
    const sources = [...sourcesMd, ...sourcesDb.map(s => ({ id: 'src-db-' + s.id, url: s.url, title: s.title || '', type: s.type || 'paper' }))];

    const seeds = store.db.prepare(`SELECT * FROM wiki_seeds WHERE wiki_slug = ? ORDER BY status, depth, created_at`).all(slug);
    const learnings = store.getLearningsByWiki(slug) || [];
    const embedCountRow = store.db.prepare(`
      SELECT COUNT(*) AS n FROM wiki_embeddings e
      JOIN wiki_pages p ON p.id = e.page_id
      WHERE p.wiki_slug = ?
    `).get(slug);

    html = buildHtml({ wiki, pages, sources, seeds, learnings, embedCount: embedCountRow?.n || 0, theme });
    const outPath = args.out || path.join(wiki.root_path, 'derived', 'viewer.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html);
    console.log(JSON.stringify({ slug, out: outPath, bytes: Buffer.byteLength(html), pages: pages.length, sources: sources.length, seeds: seeds.length }, null, 2));
  } finally {
    store.close();
  }
}

main();
