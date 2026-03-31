#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const newCwd = input.cwd || process.cwd();

    const hasGit = fs.existsSync(path.join(newCwd, '.git'));
    const hasPackageJson = fs.existsSync(path.join(newCwd, 'package.json'));
    const hasClaude = fs.existsSync(path.join(newCwd, 'CLAUDE.md')) || fs.existsSync(path.join(newCwd, '.claude'));

    console.error(`[ProWorkflow] Directory changed: ${path.basename(newCwd)}`);
    if (hasGit) console.error('[ProWorkflow]   Git: yes');
    if (hasPackageJson) console.error('[ProWorkflow]   Node project detected');
    if (!hasClaude) console.error('[ProWorkflow]   No CLAUDE.md — consider /auto-setup');

    if (process.env.CLAUDE_ENV_FILE) {
      const type = hasPackageJson ? 'node'
        : fs.existsSync(path.join(newCwd, 'Cargo.toml')) ? 'rust'
        : fs.existsSync(path.join(newCwd, 'go.mod')) ? 'go'
        : fs.existsSync(path.join(newCwd, 'pyproject.toml')) ? 'python'
        : null;

      if (type) {
        try { fs.appendFileSync(process.env.CLAUDE_ENV_FILE, `export PRO_WORKFLOW_PROJECT_TYPE=${type}\n`); }
        catch (e) { /* env file may not exist yet */ }
      }
    }

    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
