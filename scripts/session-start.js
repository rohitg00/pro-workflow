#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

function log(msg) {
  console.error(msg);
}

function findProjectRoot() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
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
  const projectRoot = findProjectRoot();
  const projectName = path.basename(projectRoot);
  const claudeDir = path.join(projectRoot, '.claude');
  const learnedFile = path.join(claudeDir, 'LEARNED.md');
  const sessionId = process.env.CLAUDE_SESSION_ID || String(process.ppid) || 'default';

  let store = null;
  try {
    store = getStore();
  } catch (e) {
    // Store not available, continue with file-based approach
  }

  if (store) {
    try {
      store.startSession(sessionId, projectName);

      const { getRecentLearnings } = require(path.join(__dirname, '..', 'dist', 'search', 'fts.js'));

      const recentLearnings = getRecentLearnings(store.db, 5, projectName);

      if (recentLearnings.length > 0) {
        log(`[ProWorkflow] Loaded ${recentLearnings.length} learnings from database:`);
        recentLearnings.slice(0, 3).forEach((l) => {
          log(`  - [${l.category}] ${l.rule}`);
        });
        if (recentLearnings.length > 3) {
          log(`  ... and ${recentLearnings.length - 3} more`);
        }
      }

      const recentSessions = store.getRecentSessions(3);
      if (recentSessions.length > 1) {
        const lastSession = recentSessions[1];
        if (lastSession && lastSession.ended_at) {
          log(`[ProWorkflow] Previous session: ${lastSession.started_at.split('T')[0]} (${lastSession.edit_count} edits, ${lastSession.corrections_count} corrections)`);
        }
      }
    } catch (e) {
      log(`[ProWorkflow] DB error: ${e.message}`);
    } finally {
      if (store) {
        try { store.close(); } catch (e) { /* ignore close errors */ }
      }
    }
  } else {
    if (fs.existsSync(learnedFile)) {
      const content = fs.readFileSync(learnedFile, 'utf8');
      const learnedPatterns = (content.match(/\[LEARN\]/g) || []).length;

      if (learnedPatterns > 0) {
        log(`[ProWorkflow] Loaded ${learnedPatterns} learned patterns from LEARNED.md`);
      }
    }

    const sessionsDir = path.join(os.tmpdir(), 'pro-workflow', 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();

      if (files.length > 0) {
        const lastSession = files[0];
        log(`[ProWorkflow] Previous session: ${lastSession}`);
      }
    }
  }

  try {
    const { execSync } = require('child_process');
    const worktrees = execSync('git worktree list 2>/dev/null', { encoding: 'utf8' });
    const count = worktrees.split('\n').filter(l => l.trim()).length;

    if (count > 1) {
      log(`[ProWorkflow] ${count} worktrees available for parallel work`);
    }
  } catch (e) {
    // Not a git repo or git not available
  }

  log('[ProWorkflow] Ready. Use /wrap-up before ending, /learn to capture corrections.');

  process.exit(0);
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
