#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readHookInput } = require('./lib/hook-input');

function getTempDir() {
  return path.join(os.tmpdir(), 'pro-workflow');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shouldBlock() {
  const env = process.env.PRO_WORKFLOW_REREAD_BLOCK;
  if (env !== undefined) return env === '1' || env === 'true';
  try {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
    return Boolean(config.reread_tracker && config.reread_tracker.block);
  } catch (e) {
    return false;
  }
}

async function main() {
  const input = await readHookInput();
  const rawSessionId = input.session_id || process.env.CLAUDE_SESSION_ID || String(process.ppid) || 'default';
  const sessionId = String(rawSessionId).replace(/[^a-zA-Z0-9_-]/g, '') || 'default';

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!filePath) return;

  const tempDir = getTempDir();
  ensureDir(tempDir);
  const trackFile = path.join(tempDir, `read-track-${sessionId}.json`);

  let tracked = {};
  if (fs.existsSync(trackFile)) {
    try {
      tracked = JSON.parse(fs.readFileSync(trackFile, 'utf8'));
    } catch (e) {
      tracked = {};
    }
  }

  const lastRead = tracked[filePath];

  if (lastRead) {
    let modified = false;
    try {
      modified = fs.statSync(filePath).mtimeMs > lastRead;
    } catch (e) {
      modified = true;
    }

    if (!modified) {
      const readCount = (tracked[`${filePath}:count`] || 1) + 1;
      tracked[`${filePath}:count`] = readCount;
      fs.writeFileSync(trackFile, JSON.stringify(tracked));
      console.error(`[TokenEfficiency] Re-reading ${path.basename(filePath)} (${readCount}x), file unchanged since last read. Use what you already read.`);
      process.exit(shouldBlock() ? 2 : 1);
    }
  }

  tracked[filePath] = Date.now();
  delete tracked[`${filePath}:count`];
  fs.writeFileSync(trackFile, JSON.stringify(tracked));
}

main().catch(() => process.exit(0));
