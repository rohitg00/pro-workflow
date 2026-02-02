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

function getStore() {
  const distPath = path.join(__dirname, '..', 'dist', 'db', 'store.js');
  if (fs.existsSync(distPath)) {
    const { createStore } = require(distPath);
    return createStore();
  }
  return null;
}

async function main() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(data);
      const prompt = input.prompt || '';
      const sessionId = input.session_id || 'default';

      const correctionPatterns = [
        /no,?\s*(that's|thats)?\s*(wrong|incorrect|not right)/i,
        /you\s*(should|shouldn't|need to|forgot)/i,
        /that's not what I (meant|asked|wanted)/i,
        /wrong file/i,
        /undo that/i,
        /revert/i,
        /don't do that/i,
        /stop/i,
        /wait/i
      ];

      const isCorrection = correctionPatterns.some(p => p.test(prompt));

      if (isCorrection) {
        log('[ProWorkflow] Correction detected - use /learn to capture this pattern');
      }

      const learnPatterns = [
        /remember (this|that)/i,
        /add (this|that) to (your )?rules/i,
        /don't (do|make) that (again|mistake)/i,
        /learn from this/i,
        /\[LEARN\]/i
      ];

      const isLearnTrigger = learnPatterns.some(p => p.test(prompt));

      if (isLearnTrigger) {
        log('[ProWorkflow] Learning trigger detected - use /learn to save to database');
      }

      let store = null;
      try {
        store = getStore();
      } catch (e) {
        // Store not available
      }

      if (store) {
        try {
          store.updateSessionCounts(sessionId, 0, isCorrection ? 1 : 0, 1);
        } catch (e) {
          store = null;
        } finally {
          if (store) {
            try { store.close(); } catch (e) { /* ignore close errors */ }
          }
        }
      }

      if (!store) {
        const tempDir = getTempDir();
        ensureDir(tempDir);
        const countFile = path.join(tempDir, `prompt-count-${sessionId}`);

        let count = 1;
        if (fs.existsSync(countFile)) {
          count = parseInt(fs.readFileSync(countFile, 'utf8').trim(), 10) + 1;
        }
        fs.writeFileSync(countFile, String(count));
      }

      console.log(data);
    } catch (err) {
      console.log(data);
    }
  });
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
