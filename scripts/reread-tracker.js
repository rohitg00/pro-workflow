#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { readHookInput } = require('./lib/hook-input');

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

function recordPath(sessionId, filePath) {
  const hash = crypto.createHash('sha1').update(filePath).digest('hex');
  return path.join(os.tmpdir(), 'pro-workflow', `read-track-${sessionId}`, `${hash}.json`);
}

function readRecord(file) {
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    return record && typeof record.at === 'number' ? record : null;
  } catch (e) {
    return null;
  }
}

function writeRecord(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(record));
  fs.renameSync(tmp, file);
}

function unchangedSince(filePath, at) {
  try {
    return fs.statSync(filePath).mtimeMs <= at;
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

  const file = recordPath(sessionId, filePath);
  const record = readRecord(file);
  const repeat = record && unchangedSince(filePath, record.at);

  if (input.hook_event_name === 'PostToolUse') {
    writeRecord(file, repeat ? { at: record.at, count: record.count + 1 } : { at: Date.now(), count: 1 });
    return;
  }

  if (!repeat) return;

  const message = `[TokenEfficiency] Re-reading ${path.basename(filePath)} (${record.count + 1}x), file unchanged since last read. Use what you already read.`;
  if (shouldBlock()) {
    console.error(message);
    process.exit(2);
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: message },
  }));
}

main().catch(() => process.exit(0));
