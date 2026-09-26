#!/usr/bin/env node
const { readHookInput } = require('./lib/hook-input');

readHookInput().then(input => {
  const text = input.task_description || input.task_subject || '';
  if (text.length < 5) {
    console.error('[ProWorkflow] Task description too short, add detail for tracking');
  }
  if (text.length > 200) {
    console.error('[ProWorkflow] Task description very long, consider breaking into subtasks');
  }
});
