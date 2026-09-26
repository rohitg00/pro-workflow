#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

readHookInput().then(input => {
  const type = input.notification_type || 'unknown';
  if (type === 'permission_prompt') {
    console.error('[ProWorkflow] Permission prompt waiting: ' + (input.message || 'Claude needs your permission'));
  } else if (type === 'idle_prompt') {
    console.error('[ProWorkflow] Claude is idle and waiting for input');
  }
});
