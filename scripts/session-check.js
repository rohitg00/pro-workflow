#!/usr/bin/env node
/**
 * Session Check (Stop Hook)
 *
 * Runs at the end of each Claude response.
 * Periodic reminders for wrap-up and learning capture.
 * Uses last_assistant_message (2.1.49+) for smarter context-aware reminders.
 */

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

function detectCompletionSignals(message) {
  if (!message) return false;
  const signals = [
    /all (changes|files|tests|updates) (are |have been )?(committed|pushed|complete|done|pass)/i,
    /successfully (created|merged|deployed|published|released)/i,
    /PR (created|merged|opened)/i,
    /implementation is complete/i,
    /everything (looks good|is working|passes)/i,
    /all \d+ tests pass/i
  ];
  return signals.some(p => p.test(message));
}

function detectLargeChange(message) {
  if (!message) return false;
  const patterns = [
    /(\d+) files? (changed|modified|updated|created)/i,
    /across \d+ files/i,
    /refactored? \d+ (files?|modules?|components?)/i
  ];
  return patterns.some(p => p.test(message));
}

async function main() {
  let data = '';

  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(data);
      const lastMessage = (input.last_assistant_message || '').slice(-2000);

      const tempDir = getTempDir();
      ensureDir(tempDir);

      const sessionId = input.session_id || process.env.CLAUDE_SESSION_ID || process.ppid || 'default';
      const responseCountFile = path.join(tempDir, `response-count-${sessionId}`);

      let count = 1;

      if (fs.existsSync(responseCountFile)) {
        count = parseInt(fs.readFileSync(responseCountFile, 'utf8').trim(), 10) + 1;
      }

      fs.writeFileSync(responseCountFile, String(count));

      if (lastMessage && detectCompletionSignals(lastMessage)) {
        log('[ProWorkflow] Task looks complete — consider /wrap-up to capture learnings');
      } else if (lastMessage && detectLargeChange(lastMessage)) {
        log('[ProWorkflow] Large change detected — good checkpoint for review');
      } else {
        const shouldRemind = count % 20 === 0;

        if (shouldRemind) {
          const reminderType = Math.floor(count / 20) % 3;

          switch (reminderType) {
            case 0:
              log('[ProWorkflow] Consider /wrap-up if ending session soon');
              break;
            case 1:
              log('[ProWorkflow] Any corrections to capture? Use /learn-rule');
              break;
            case 2:
              log('[ProWorkflow] Good checkpoint for /compact if context is heavy');
              break;
          }
        }
      }

      if (count === 50) {
        log('[ProWorkflow] Long session - strongly consider:');
        log('[ProWorkflow]   /wrap-up - capture learnings');
        log('[ProWorkflow]   /compact - preserve context');
      }

      console.log(data);
    } catch (err) {
      console.error('[ProWorkflow] session-check error:', err.message);
      console.log(data || '{}');
    }
  });
}

main().catch(err => {
  console.error('[ProWorkflow] Error:', err.message);
  process.exit(0);
});
