#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const tool = input.tool || 'unknown';
    const cmd = (input.tool_input && input.tool_input.command) || '';
    const dangerous = ['rm -rf', 'docker', 'deploy', 'npm publish', 'push --force', 'reset --hard'];
    const isDangerous = dangerous.some(p => tool.includes(p) || cmd.includes(p));
    if (isDangerous) {
      console.error('[ProWorkflow] CAUTION: Dangerous operation requested: ' + tool + (cmd ? ' cmd: ' + cmd : ''));
    }
    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
