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
    const compactsDir = path.join(tempDir, 'compacts');

    let restored = false;
    if (fs.existsSync(compactsDir)) {
      const files = fs.readdirSync(compactsDir).filter(f => f.endsWith('.json')).sort().reverse();
      if (files.length > 0) {
        const saved = JSON.parse(fs.readFileSync(path.join(compactsDir, files[0]), 'utf8'));
        console.error('[ProWorkflow] Context restored after compaction:');
        if (saved.summary) {
          console.error('[ProWorkflow]   Summary: ' + saved.summary);
        }
        if (saved.edits_before_compact) {
          console.error('[ProWorkflow]   Edits before compact: ' + saved.edits_before_compact);
        }
        if (saved.prompts_before_compact) {
          console.error('[ProWorkflow]   Prompts before compact: ' + saved.prompts_before_compact);
        }
        if (saved.session_id) {
          console.error('[ProWorkflow]   Session: ' + saved.session_id);
        }
        restored = true;
      }
    }
    if (!restored) {
      console.error('[ProWorkflow] Post-compact: no saved context found (pre-compact may not have run)');
    }

    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
