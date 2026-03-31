#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const trigger = input.trigger || 'unknown';
    const cwd = process.cwd();

    if (trigger === 'init') {
      console.error('[ProWorkflow] Initial setup detected');

      const checks = [];
      if (fs.existsSync(path.join(cwd, 'package.json'))) checks.push('Node.js project');
      if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) checks.push('Rust project');
      if (fs.existsSync(path.join(cwd, 'go.mod'))) checks.push('Go project');
      if (fs.existsSync(path.join(cwd, 'pyproject.toml'))) checks.push('Python project');

      if (checks.length > 0) {
        console.error(`[ProWorkflow] Detected: ${checks.join(', ')}`);
      }

      if (!fs.existsSync(path.join(cwd, 'CLAUDE.md')) && !fs.existsSync(path.join(cwd, '.claude'))) {
        console.error('[ProWorkflow] No CLAUDE.md found — use /auto-setup to configure');
      }
    }

    if (trigger === 'maintenance') {
      const tempDir = path.join(os.tmpdir(), 'pro-workflow');
      const denialsFile = path.join(tempDir, 'permission-denials.json');
      if (fs.existsSync(denialsFile)) {
        try {
          const denials = JSON.parse(fs.readFileSync(denialsFile, 'utf8'));
          const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
          const recent = denials.filter(d => Date.now() - new Date(d.timestamp).getTime() < ONE_WEEK_MS);
          if (recent.length > 20) {
            console.error(`[ProWorkflow] ${recent.length} permission denials this week — consider /permission-tuner`);
          }
        } catch (e) { /* ignore */ }
      }
    }

    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
