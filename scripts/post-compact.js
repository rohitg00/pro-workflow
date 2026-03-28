#!/usr/bin/env node
process.stdin.setEncoding('utf8');
const fs = require('fs');
const path = require('path');
const os = require('os');

let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);

    const tempDir = path.join(os.tmpdir(), 'pro-workflow');
    const contextFile = path.join(tempDir, 'pre-compact-context.json');

    if (fs.existsSync(contextFile)) {
      const saved = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
      console.error('[ProWorkflow] Context restored after compaction:');
      if (saved.task) {
        console.error('[ProWorkflow]   Task: ' + saved.task);
      }
      if (saved.key_files && saved.key_files.length > 0) {
        console.error('[ProWorkflow]   Key files: ' + saved.key_files.slice(0, 5).join(', '));
      }
      if (saved.learnings && saved.learnings.length > 0) {
        console.error('[ProWorkflow]   Learnings: ' + saved.learnings.length + ' captured this session');
      }
      if (saved.edit_count) {
        console.error('[ProWorkflow]   Edits so far: ' + saved.edit_count);
      }
    } else {
      console.error('[ProWorkflow] Post-compact: no saved context found (pre-compact may not have run)');
    }

    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
