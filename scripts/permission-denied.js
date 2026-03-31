#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const tempDir = path.join(os.tmpdir(), 'pro-workflow');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const denialsFile = path.join(tempDir, 'permission-denials.json');
    let denials = [];
    if (fs.existsSync(denialsFile)) {
      try { const parsed = JSON.parse(fs.readFileSync(denialsFile, 'utf8')); denials = Array.isArray(parsed) ? parsed : []; } catch (e) { denials = []; }
    }

    const entry = {
      timestamp: new Date().toISOString(),
      tool: input.tool_name || 'unknown',
      input_summary: input.tool_input ? JSON.stringify(input.tool_input).slice(0, 100) : '',
      session_id: input.session_id || 'unknown'
    };

    denials.push(entry);
    if (denials.length > 500) denials = denials.slice(-500);
    fs.writeFileSync(denialsFile, JSON.stringify(denials, null, 2));

    const toolCounts = {};
    denials.forEach(d => { toolCounts[d.tool] = (toolCounts[d.tool] || 0) + 1; });
    const topDenied = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    if (denials.length > 0 && denials.length % 10 === 0) {
      console.error('[ProWorkflow] Permission denial patterns detected:');
      topDenied.forEach(([tool, count]) => {
        console.error(`  ${tool}: denied ${count}x — consider /permission-tuner`);
      });
    }

    console.log(data);
  } catch (err) {
    console.log(data || '{}');
  }
});
