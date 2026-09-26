#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

readHookInput().then(input => {
  const id = input.agent_id ? ' [' + input.agent_id + ']' : '';
  console.error('[ProWorkflow] Subagent finished: ' + (input.agent_type || 'unnamed') + id);
});
