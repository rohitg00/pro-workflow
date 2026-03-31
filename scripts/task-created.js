#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const description = input.description || '';

    if (description.length < 5) {
      console.error('[ProWorkflow] Task description too short — add detail for tracking');
    }

    if (description.length > 200) {
      console.error('[ProWorkflow] Task description very long — consider breaking into subtasks');
    }

    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
