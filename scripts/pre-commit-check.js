#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    JSON.parse(data);
    console.error('[ProWorkflow] Before commit: lint, typecheck, test?');
    console.error('[ProWorkflow] Run quality gates first: npm run lint && npm run typecheck');
    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
