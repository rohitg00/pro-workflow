#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const out = (input.tool_output && input.tool_output.output) || '';
    if (/fail|error|FAIL/i.test(out)) {
      console.error('[ProWorkflow] Tests failed - fix before proceeding');
      const failLine = out.split('\n').find(l => /fail|error/i.test(l));
      if (failLine) {
        console.error('[ProWorkflow] Consider: [LEARN] Testing: ' + failLine.slice(0, 80));
      }
    }
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
