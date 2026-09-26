#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

readHookInput().then(input => {
  const label = input.task_subject || input.task_id || 'unknown';
  const by = input.teammate_name ? ' by ' + input.teammate_name : '';
  console.error('[ProWorkflow] Task completed: ' + label + by);
  console.error('[ProWorkflow] Run quality gates before marking done');
});
