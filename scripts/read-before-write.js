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

  const readTrackFile = path.join(tempDir, `reads-${sessionId}.json`);

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

  const tool = parsed.tool_name || parsed.tool || '';
  const toolInput = parsed.tool_input || {};

  let readFiles = {};
  if (fs.existsSync(readTrackFile)) {
    try {
      readFiles = JSON.parse(fs.readFileSync(readTrackFile, 'utf8'));
    } catch (e) {
      readFiles = {};
    }
  }

  if (tool === 'Read') {
    const filePath = toolInput.file_path || '';
    if (filePath) {
      readFiles[filePath] = Date.now();
      fs.writeFileSync(readTrackFile, JSON.stringify(readFiles));
    }
    process.exit(0);
  }

  if (tool === 'Write' || tool === 'Edit') {
    const filePath = toolInput.file_path || '';
    if (!filePath) {
      process.exit(0);
    }

    if (tool === 'Write' && !fs.existsSync(filePath)) {
      process.exit(0);
    }

    if (!readFiles[filePath]) {
      console.error(`[TokenEfficiency] Warning: ${tool} on ${path.basename(filePath)} without reading it first. Read the file before modifying.`);
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
