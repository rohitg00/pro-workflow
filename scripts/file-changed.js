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
      /\.env/,
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

    if (isImportant) {
      console.error('[ProWorkflow] Important config file changed: ' + filePath);

      if (/package\.json$/.test(filePath)) {
        console.error('[ProWorkflow]   Run: npm install to sync dependencies');
      } else if (/\.env/.test(filePath)) {
        console.error('[ProWorkflow]   CAUTION: .env changed — verify no secrets are committed');
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
      }
    }

    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
