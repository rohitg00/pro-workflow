#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    console.error('[ProWorkflow] Subagent started: ' + (input.agent_name || 'unnamed'));
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
