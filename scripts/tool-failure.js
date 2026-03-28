#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    console.error('[ProWorkflow] Tool failed: ' + (input.tool || 'unknown'));
    console.error('[ProWorkflow] Consider: [LEARN] Debugging: Tool failure in ' + (input.tool || 'unknown'));
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
