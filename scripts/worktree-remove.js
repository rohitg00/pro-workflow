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

    console.error(`[ProWorkflow] Worktree removed: ${input.worktree_path || 'unknown'}`);

    const tempDir = path.join(os.tmpdir(), 'pro-workflow');
    const worktreeLog = path.join(tempDir, 'worktrees.json');
    if (fs.existsSync(worktreeLog)) {
      try {
        let worktrees = JSON.parse(fs.readFileSync(worktreeLog, 'utf8'));
        worktrees = worktrees.filter(w => w.worktree_path !== input.worktree_path);
        fs.writeFileSync(worktreeLog, JSON.stringify(worktrees, null, 2));
      } catch (e) { /* ignore */ }
    }

    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
