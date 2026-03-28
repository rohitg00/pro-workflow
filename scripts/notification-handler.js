#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    if (input.type === 'PermissionRequest') {
      console.error('[ProWorkflow] Permission requested: ' + input.tool);
    }
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
