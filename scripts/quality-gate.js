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
  const sessionId = process.env.CLAUDE_SESSION_ID || String(process.ppid) || 'default';

  let count = 1;
  let store = null;

  try {
    store = getStore();
  } catch (e) {
    // Store not available
  }

  if (store) {
    try {
      const session = store.getSession(sessionId);
      if (session) {
        store.updateSessionCounts(sessionId, 1, 0, 0);
        count = session.edit_count + 1;
      }
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

    const editCountFile = path.join(tempDir, `edit-count-${sessionId}`);

    if (fs.existsSync(editCountFile)) {
      count = parseInt(fs.readFileSync(editCountFile, 'utf8').trim(), 10) + 1;
    }

    fs.writeFileSync(editCountFile, String(count));
  }

  if (count === 5) {
    log('[ProWorkflow] 5 edits reached - good checkpoint for review');
    log('[ProWorkflow] Run: git diff --stat | to see changes');
  }

  if (count === 10) {
    log('[ProWorkflow] 10 edits - strongly consider quality gates:');
    log('[ProWorkflow]   npm run lint && npm run typecheck && npm test --changed');
  }

  if (count > 10 && count % 10 === 0) {
    log(`[ProWorkflow] ${count} edits - run quality gates before continuing`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
