#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

readHookInput().then(input => {
  console.error('[ProWorkflow] Teammate idle: ' + (input.teammate_name || 'unnamed'));
  console.error('[ProWorkflow] Consider reassigning or checking for blockers');
});
