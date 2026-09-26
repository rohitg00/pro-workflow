#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    console.error('[ProWorkflow] Pushing to remote...');
    console.error('[ProWorkflow] Consider /wrap-up to capture learnings from this session');
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
  }
});
