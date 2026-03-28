#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    console.error('[ProWorkflow] Task completed: ' + (input.task_id || 'unknown'));
    console.error('[ProWorkflow] Run quality gates before marking done');
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
