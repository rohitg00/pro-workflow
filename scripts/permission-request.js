#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

const DANGEROUS = [
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

readHookInput().then(input => {
  const tool = (input.tool_name || 'unknown').toLowerCase();
  const cmd = ((input.tool_input && input.tool_input.command) || '').toLowerCase();
  if (DANGEROUS.some(p => p.test(cmd))) {
    console.error('[ProWorkflow] CAUTION: Dangerous operation requested: ' + tool + ' cmd: ' + cmd);
  }
});
