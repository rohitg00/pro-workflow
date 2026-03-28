#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    console.error('[ProWorkflow] Teammate idle: ' + (input.teammate_name || 'unnamed'));
    console.error('[ProWorkflow] Consider reassigning or checking for blockers');
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
