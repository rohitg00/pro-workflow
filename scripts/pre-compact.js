#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

function getTempDir() {
  return path.join(os.tmpdir(), 'pro-workflow');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function log(msg) {
  console.error(msg);
}

function getDateString() {
  return new Date().toISOString().split('T')[0];
}

function getTimeString() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

async function main() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(data);
      const sessionId = input.session_id || 'default';

      const tempDir = getTempDir();
      const compactDir = path.join(tempDir, 'compacts');
      ensureDir(compactDir);

      const compactFile = path.join(compactDir, `${getDateString()}-${sessionId.slice(-6)}.json`);

      const state = {
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        trigger: input.trigger || 'unknown',
        custom_instructions: input.custom_instructions || null
      };

      const editCountFile = path.join(tempDir, `edit-count-${sessionId}`);
      if (fs.existsSync(editCountFile)) {
        state.edits_before_compact = parseInt(fs.readFileSync(editCountFile, 'utf8').trim(), 10);
      }

      const promptCountFile = path.join(tempDir, `prompt-count-${sessionId}`);
      if (fs.existsSync(promptCountFile)) {
        state.prompts_before_compact = parseInt(fs.readFileSync(promptCountFile, 'utf8').trim(), 10);
      }

      fs.writeFileSync(compactFile, JSON.stringify(state, null, 2));

      log('[ProWorkflow] Context compacting - state saved');
      log(`[ProWorkflow] Edits: ${state.edits_before_compact || 0}, Prompts: ${state.prompts_before_compact || 0}`);

      if (fs.existsSync(editCountFile)) {
        fs.writeFileSync(editCountFile, '0');
      }
      if (fs.existsSync(promptCountFile)) {
        fs.writeFileSync(promptCountFile, '0');
      }

    } catch (err) {
    }
  });
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
