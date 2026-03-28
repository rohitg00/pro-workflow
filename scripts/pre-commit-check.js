#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    console.error('[ProWorkflow] Before commit: lint, typecheck, test?');
    console.error('[ProWorkflow] Run quality gates first: npm run lint && npm run typecheck');
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
