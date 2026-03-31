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
    const tempDir = path.join(os.tmpdir(), 'pro-workflow');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const worktreeLog = path.join(tempDir, 'worktrees.json');
    let worktrees = [];
    if (fs.existsSync(worktreeLog)) {
      try { worktrees = JSON.parse(fs.readFileSync(worktreeLog, 'utf8')); } catch (e) { worktrees = []; }
    }

    worktrees.push({
      timestamp: new Date().toISOString(),
      session_id: input.session_id || 'unknown',
      worktree_path: input.worktree_path || 'unknown',
      branch: input.branch || 'unknown'
    });

    if (worktrees.length > 100) worktrees = worktrees.slice(-100);
    fs.writeFileSync(worktreeLog, JSON.stringify(worktrees, null, 2));

    console.error(`[ProWorkflow] Worktree created: ${input.branch || 'unknown'}`);
    console.error('[ProWorkflow] Isolated workspace ready for parallel work');

    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
