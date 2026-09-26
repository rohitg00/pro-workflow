#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const command = (input.tool_input && input.tool_input.command) || '';
    if (!/(npm test|pnpm test|yarn test|bun test|pytest|go test|cargo test|vitest|jest)\b/.test(command)) {
      return;
    }
    const response = input.tool_response || {};
    const out = [response.stdout, response.stderr, input.tool_output && input.tool_output.output]
      .filter(part => typeof part === 'string')
      .join('\n');
    if (/fail|error/i.test(out)) {
      console.error('[ProWorkflow] Tests failed - fix before proceeding');
      const failLine = out.split('\n').find(l => /fail|error/i.test(l));
      if (failLine) {
        console.error('[ProWorkflow] Consider: [LEARN] Testing: ' + failLine.slice(0, 80));
      }
    }
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
  }
});
