#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function getStore() {
  const distPath = path.join(__dirname, '..', 'dist', 'db', 'store.js');
  if (fs.existsSync(distPath)) {
    const mod = require(distPath);
    if (typeof mod.createStore === 'function') {
      return mod.createStore();
    }
  }
  return null;
}

async function main() {
  let data = '';
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(data);
      const response = input.assistant_response || '';
      if (!response) {
        console.log(data);
        return;
      }

      const regex = /\[LEARN\]\s*([\w][\w\s-]*?)\s*:\s*(.+?)(?:\nMistake:\s*(.+?))?(?:\nCorrection:\s*(.+?))?(?=\n\[LEARN\]|\n\n|$)/gim;

      let match;
      let store = null;
      let count = 0;
      let lastIndex = -1;

      while ((match = regex.exec(response)) !== null) {
        if (regex.lastIndex === lastIndex) break;
        lastIndex = regex.lastIndex;

        if (!store) store = getStore();
        if (!store) break;

        const projectDir = process.env.CLAUDE_PROJECT_DIR || '';
        store.addLearning({
          project: projectDir ? path.basename(projectDir) : null,
          category: match[1].trim(),
          rule: match[2].trim(),
          mistake: match[3]?.trim() || null,
          correction: match[4]?.trim() || null,
        });
        count++;
      }

      if (count > 0) {
        console.error(`[ProWorkflow] Auto-saved ${count} learning(s) to database`);
      }
      if (store) store.close();
    } catch (err) {
      console.error(`[ProWorkflow] Learn-capture error: ${err.message}`);
    }
    console.log(data);
  });
}

main().catch(() => process.exit(0));
