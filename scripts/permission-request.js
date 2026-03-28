#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const tool = (input.tool || 'unknown').toLowerCase();
    const cmd = ((input.tool_input && input.tool_input.command) || '').toLowerCase();
    const dangerous = ['rm -rf', 'docker', 'deploy', 'npm publish', 'push --force', 'reset --hard', 'push -f', 'rm -r -f'];
    const isDangerous = dangerous.some(p => tool.includes(p) || cmd.includes(p));
    if (isDangerous) {
      console.error('[ProWorkflow] CAUTION: Dangerous operation requested: ' + tool + (cmd ? ' cmd: ' + cmd : ''));
    }
    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
