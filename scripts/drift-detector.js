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

async function main() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(data);
      const prompt = input.prompt || '';
      const sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || String(process.ppid) || 'default';

      const tempDir = getTempDir();
      ensureDir(tempDir);

      const intentFile = path.join(tempDir, `intent-${sessionId}`);
      const editLogFile = path.join(tempDir, `edit-log-${sessionId}`);

      if (!fs.existsSync(intentFile)) {
        const intent = extractIntent(prompt);
        if (intent) {
          fs.writeFileSync(intentFile, JSON.stringify({
            original: prompt.slice(0, 500),
            intent,
            timestamp: Date.now(),
            editsSinceLastTouch: 0
          }));
        }
        return;
      }

      const state = JSON.parse(fs.readFileSync(intentFile, 'utf8'));
      state.editsSinceLastTouch = (state.editsSinceLastTouch || 0) + 1;

      const intentKeywords = extractKeywords(state.intent);
      const promptKeywords = extractKeywords(prompt);

      const overlap = intentKeywords.filter(k => promptKeywords.includes(k)).length;
      const relevance = intentKeywords.length > 0 ? overlap / intentKeywords.length : 1;

      if (state.editsSinceLastTouch >= 6 && relevance < 0.2) {
        log(`[ProWorkflow] Drift check: ${state.editsSinceLastTouch} edits since original goal`);
        log(`[ProWorkflow] Original intent: "${state.intent}"`);
        log('[ProWorkflow] Current work seems unrelated — refocusing or intentional tangent?');
        state.editsSinceLastTouch = 0;
      }

      if (isNewIntent(prompt)) {
        const newIntent = extractIntent(prompt);
        if (newIntent) {
          state.intent = newIntent;
          state.original = prompt.slice(0, 500);
          state.editsSinceLastTouch = 0;
        }
      }

      fs.writeFileSync(intentFile, JSON.stringify(state));
    } catch (err) {
    }
  });
}

function extractIntent(prompt) {
  if (!prompt || prompt.length < 10) return null;
  const firstSentence = prompt.split(/[.!?\n]/)[0].trim();
  return firstSentence.slice(0, 200);
}

function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'be', 'been', 'have', 'has',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'and', 'but', 'or', 'not', 'so', 'if', 'then', 'than', 'too',
    'very', 'just', 'also', 'that', 'this', 'it', 'its', 'my', 'your',
    'me', 'i', 'we', 'you', 'he', 'she', 'they', 'them', 'our',
    'please', 'make', 'use', 'get', 'let', 'add', 'need', 'want',
    'like', 'know', 'think', 'look', 'see', 'come', 'go', 'run'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function isNewIntent(prompt) {
  const newIntentPatterns = [
    /^(now|next|also|okay|ok)\s+(let's|can you|please|i need)/i,
    /^(switch|move|pivot|change)\s+(to|focus)/i,
    /^(forget|skip|instead|actually)/i,
    /^new task/i
  ];
  return newIntentPatterns.some(p => p.test(prompt.trim()));
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
