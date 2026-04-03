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

  const trackFile = path.join(tempDir, `read-track-${sessionId}.json`);

  let input = '';
  try {
    input = fs.readFileSync('/dev/stdin', 'utf8');
  } catch (e) {
    process.exit(0);
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    process.exit(0);
  }

  const toolInput = parsed.tool_input || {};
  const filePath = toolInput.file_path || '';
  if (!filePath) {
    process.exit(0);
  }

  let tracked = {};
  if (fs.existsSync(trackFile)) {
    try {
      tracked = JSON.parse(fs.readFileSync(trackFile, 'utf8'));
    } catch (e) {
      tracked = {};
    }
  }

  const lastRead = tracked[filePath];
  const now = Date.now();

  if (lastRead) {
    let modified = false;
    try {
      const stat = fs.statSync(filePath);
      modified = stat.mtimeMs > lastRead;
    } catch (e) {
      modified = true;
    }

    if (!modified) {
      const readCount = (tracked[`${filePath}:count`] || 1) + 1;
      tracked[`${filePath}:count`] = readCount;
      if (readCount >= 2) {
        console.error(`[TokenEfficiency] Re-reading ${path.basename(filePath)} (${readCount}x) — file unchanged since last read. Consider using cached knowledge.`);
      }
    }
  }

  tracked[filePath] = now;
  fs.writeFileSync(trackFile, JSON.stringify(tracked));

  process.exit(0);
}

main().catch(() => process.exit(0));
