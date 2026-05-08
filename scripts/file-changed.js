#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.file_path || input.path || '';

    const importantPatterns = [
      /package\.json$/,
      /tsconfig.*\.json$/,
      /\/\.env$|^\.env$/,
      /Dockerfile/,
      /docker-compose/,
      /\.github\/workflows\//,
      /CLAUDE\.md$/,
      /\.claude\//,
      /Cargo\.toml$/,
      /pyproject\.toml$/,
      /go\.mod$/,
      /Makefile$/
    ];

    const isImportant = importantPatterns.some(p => p.test(filePath));

    // Reactive wiki seed enqueue: edits inside a wiki/ tree spawn a verify seed.
    const wikiMatch = filePath.match(/(?:^|\/)\.claude\/wikis\/([^/]+)\/wiki\/.+\.md$/) ||
                      filePath.match(/(?:^|\/)\.pro-workflow\/wikis\/([^/]+)\/wiki\/.+\.md$/);
    if (wikiMatch) {
      try {
        const path2 = require('path');
        const fs2 = require('fs');
        const distPath = path2.join(__dirname, '..', 'dist', 'db', 'store.js');
        if (fs2.existsSync(distPath)) {
          const { createStore } = require(distPath);
          const store = createStore();
          try {
            const slug = wikiMatch[1];
            const w = store.getWiki(slug);
            if (w) {
              const rel = path2.relative(w.root_path, filePath);
              store.enqueueSeed({ wiki_slug: slug, query: `verify edits in ${rel}`, depth: 0 });
              console.error(`[ProWorkflow] enqueued verify seed for ${slug}/${rel}`);
            }
          } finally { store.close(); }
        }
      } catch (e) { /* never break the hook */ }
    }

    if (isImportant) {
      console.error('[ProWorkflow] Important config file changed: ' + filePath);

      if (/package\.json$/.test(filePath)) {
        console.error('[ProWorkflow]   Run: npm install to sync dependencies');
      } else if (/\/\.env$|^\.env$/.test(filePath)) {
        console.error('[ProWorkflow]   CAUTION: .env changed — verify no secrets are committed');
      } else if (/tsconfig.*\.json$/.test(filePath)) {
        console.error('[ProWorkflow]   Run: tsc --noEmit to verify TypeScript config');
      } else if (/Dockerfile|docker-compose/.test(filePath)) {
        console.error('[ProWorkflow]   Rebuild containers: docker compose up --build');
      } else if (/\.github\/workflows\//.test(filePath)) {
        console.error('[ProWorkflow]   CI workflow changed — verify pipeline still passes');
      } else if (/CLAUDE\.md$/.test(filePath)) {
        console.error('[ProWorkflow]   CLAUDE.md changed — context instructions updated');
      } else if (/Cargo\.toml$/.test(filePath)) {
        console.error('[ProWorkflow]   Run: cargo check to verify dependencies');
      } else if (/pyproject\.toml$/.test(filePath)) {
        console.error('[ProWorkflow]   Run: pip install -e . to sync dependencies');
      } else if (/go\.mod$/.test(filePath)) {
        console.error('[ProWorkflow]   Run: go mod tidy to sync dependencies');
      } else if (/\.claude\//.test(filePath)) {
        console.error('[ProWorkflow]   .claude/ config changed — context or rules may be affected');
      } else if (/Makefile$/.test(filePath)) {
        console.error('[ProWorkflow]   Makefile changed — verify build targets still work');
      }
    }

    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
