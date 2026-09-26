#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const systemOne = require('./lib/system-one');

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

const CORRECTION_QUESTION = {
  correction: {
    type: 'noul',
    instructions: "Is the user correcting or rejecting the assistant's previous action?",
    labels: {
      true: 'The user says the previous action was wrong, unwanted, or must be undone',
      false: 'The user gives a new request, a question, or approval',
    },
  },
};

async function detectCorrection(prompt) {
  const cfg = systemOne.loadConfig();
  if (!cfg.enabled || prompt.trim().split(/\s+/).length < 2) return false;
  const answers = await systemOne.classify(prompt, CORRECTION_QUESTION, { config: cfg });
  const p = answers && answers.correction ? Number(answers.correction.noul) : NaN;
  const threshold = Number(cfg.correction_threshold) || systemOne.DEFAULTS.correction_threshold;
  return Number.isFinite(p) && p >= threshold ? p : false;
}

async function main() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', async () => {
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

      const heuristicCorrection = correctionPatterns.some(p => p.test(prompt));
      const classifierCorrection = heuristicCorrection ? false : await detectCorrection(prompt);
      const isCorrection = heuristicCorrection || classifierCorrection;

      if (heuristicCorrection) {
        log('[ProWorkflow] Correction detected - use /learn to capture this pattern');
      } else if (classifierCorrection) {
        log(`[ProWorkflow] Correction detected by system-one classifier (p=${classifierCorrection.toFixed(2)}) - use /learn to capture this pattern`);
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
      let sessionUpdated = false;
      try {
        store = getStore();
      } catch (e) {
        // Store not available
      }

      if (store) {
        try {
          const session = store.getSession(sessionId);
          if (session) {
            store.updateSessionCounts(sessionId, 0, isCorrection ? 1 : 0, 1);
            sessionUpdated = true;
          }

          if (typeof store.searchWiki === 'function' && prompt.split(/\s+/).length >= 3) {
            const hits = store.searchWiki(prompt, { limit: 3, loose: true });
            if (hits.length > 0) {
              log(`[ProWorkflow] ${hits.length} relevant wiki page(s):`);
              for (const h of hits) {
                log(`  - ${h.wiki_slug} · ${h.rel_path} — ${h.title}`);
              }
              log('  (use /wiki ask "<query>" --wiki <slug> for full retrieval)');
            }
          }
        } catch (e) {
          // DB error, fall back to file-based
        } finally {
          if (store) {
            try { store.close(); } catch (e) { /* ignore close errors */ }
          }
        }
      }

      if (!sessionUpdated) {
        const tempDir = getTempDir();
        ensureDir(tempDir);
        const countFile = path.join(tempDir, `prompt-count-${sessionId}`);

        let count = 1;
        if (fs.existsSync(countFile)) {
          count = parseInt(fs.readFileSync(countFile, 'utf8').trim(), 10) + 1;
        }
        fs.writeFileSync(countFile, String(count));
      }

    } catch (err) {
    }
  });
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
