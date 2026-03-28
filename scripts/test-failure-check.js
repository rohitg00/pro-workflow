#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const rawOut = (input.tool_output && input.tool_output.output) || '';
    const out = typeof rawOut === 'string' ? rawOut : '';
    if (/fail|error/i.test(out)) {
      console.error('[ProWorkflow] Tests failed - fix before proceeding');
      const failLine = out.split('\n').find(l => /fail|error/i.test(l));
      if (failLine) {
        console.error('[ProWorkflow] Consider: [LEARN] Testing: ' + failLine.slice(0, 80));
      }
    }
    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
