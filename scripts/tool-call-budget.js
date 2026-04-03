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

async function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID || String(process.ppid) || 'default';
  const tempDir = getTempDir();
  ensureDir(tempDir);

  const budgetFile = path.join(tempDir, `tool-budget-${sessionId}`);

  let count = 0;
  if (fs.existsSync(budgetFile)) {
    count = parseInt(fs.readFileSync(budgetFile, 'utf8').trim(), 10) || 0;
  }
  count++;
  fs.writeFileSync(budgetFile, String(count));

  const thresholds = [
    { limit: 20, label: 'quick-fix budget (20 calls)' },
    { limit: 30, label: 'bug-fix budget (30 calls)' },
    { limit: 50, label: 'feature budget (50 calls)' },
    { limit: 80, label: 'large-feature budget (80 calls)' }
  ];

  for (const t of thresholds) {
    const warnAt = Math.floor(t.limit * 0.8);
    if (count === warnAt) {
      console.error(`[TokenEfficiency] ${count} tool calls — approaching ${t.label}. Consider wrapping up or compacting.`);
      break;
    }
    if (count === t.limit) {
      console.error(`[TokenEfficiency] ${count} tool calls — hit ${t.label}. Commit progress and assess remaining work.`);
      break;
    }
  }

  if (count === 65) {
    console.error('[TokenEfficiency] 65 tool calls — approaching large-feature limit. Wrap up current task.');
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
