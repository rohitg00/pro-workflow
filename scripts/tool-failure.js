#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

readHookInput().then(input => {
  if (input.is_interrupt) return;
  const tool = input.tool_name || 'unknown';
  const firstLine = String(input.error || '').split('\n')[0];
  console.error('[ProWorkflow] Tool failed: ' + tool + (firstLine ? ' (' + firstLine + ')' : ''));
  console.error('[ProWorkflow] Consider: [LEARN] Debugging: Tool failure in ' + tool);
});
