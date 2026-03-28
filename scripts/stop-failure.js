#!/usr/bin/env node
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const error = input.error || input.message || 'unknown error';
    const code = input.status_code || input.code || '';

    console.error('[ProWorkflow] API error occurred: ' + error);
    if (code) {
      console.error('[ProWorkflow]   Status: ' + code);
    }

    if (/rate.?limit|429/i.test(String(error) + String(code))) {
      console.error('[ProWorkflow]   Rate limited — wait a moment and retry');
    } else if (/timeout|504|408/i.test(String(error) + String(code))) {
      console.error('[ProWorkflow]   Timeout — retry with a simpler prompt or /compact first');
    } else if (/5\d{2}|server/i.test(String(error) + String(code))) {
      console.error('[ProWorkflow]   Server error — retry in a few seconds');
    } else {
      console.error('[ProWorkflow]   Consider retrying or simplifying the request');
    }

    console.log(data);
  } catch (err) {
    console.error('[ProWorkflow] stop-failure error: ' + err.message);
    console.log(data || '{}');
  }
});
