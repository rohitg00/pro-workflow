#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const tool = (input.tool || 'unknown').toLowerCase();
    const cmd = ((input.tool_input && input.tool_input.command) || '').toLowerCase();
    const dangerous = [
      /\brm\s+(-[rRf]+\s+)*-?[rRf]/,
      /\bdocker\s+(rm|rmi|system\s+prune|container\s+prune)/,
      /\bnpm\s+publish\b/,
      /\bgit\s+push\s+.*--force/,
      /\bgit\s+push\s+-f\b/,
      /\bgit\s+reset\s+--hard/,
      /\bsudo\s+rm\b/,
      /\bchmod\s+777\b/,
      /\bcurl\s+.*\|\s*(ba)?sh/,
      /\bwget\s+.*\|\s*(ba)?sh/,
      /\bdd\s+if=/,
      /\bmkfs\b/,
      />\s*\/dev\//,
    ];
    const isDangerous = dangerous.some(p => p.test(cmd));
    if (isDangerous) {
      console.error('[ProWorkflow] CAUTION: Dangerous operation requested: ' + tool + (cmd ? ' cmd: ' + cmd : ''));
    }
    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] JSON parse error:', err.message);
    console.log(data || '{}');
  }
});
