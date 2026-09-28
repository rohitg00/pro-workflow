#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { readHookInput } = require('./lib/hook-input');

const DANGEROUS = [
  { re: /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s|--recursive|--force)/, label: 'rm with -r or -f' },
  { re: /\bDROP\s+(TABLE|DATABASE|INDEX|VIEW)\b/i, label: 'DROP SQL statement' },
  { re: /\bTRUNCATE\b/i, label: 'TRUNCATE SQL statement' },
  { re: /\bgit\s+push\s+(?:\S+\s+)*(-[a-zA-Z]*f\b|--force\b)/, label: 'git force-push' },
  { re: /\bgit\s+reset\s+--hard\b/, label: 'git hard reset' },
  { re: /\bgit\s+clean\s+-[a-zA-Z]*f/, label: 'git clean -f' },
  { re: /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, label: 'git discard all changes' },
  { re: /\bchmod\s+(-R\s+)?777\b/, label: 'chmod 777' },
  { re: /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(sh|bash|zsh)\b/, label: 'piped remote execution' },
  { re: /\bdd\s+if=|>\s*\/dev\/(sd|disk|nvme)/, label: 'disk-level write' },
  { re: /:\(\)\s*\{\s*:\|:&\s*\};:/, label: 'fork bomb' },
  { re: /\bsudo\s+rm\b/, label: 'elevated deletion' },
];

function projectRoot(input = {}) {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());
}

function statePath(root) {
  const hash = crypto.createHash('sha1').update(root).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), 'pro-workflow', `safe-mode-${hash}.json`);
}

function readState(root) {
  try {
    return JSON.parse(fs.readFileSync(statePath(root), 'utf8'));
  } catch (e) {
    return { cautious: false, lockdownPath: null };
  }
}

function writeState(root, state) {
  const file = statePath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...state, root, updatedAt: new Date().toISOString() }));
}

function realish(p) {
  try {
    return fs.realpathSync(p);
  } catch (e) {
    const parent = path.dirname(p);
    return parent === p ? p : path.join(realish(parent), path.basename(p));
  }
}

function isInside(filePath, allowed) {
  const rel = path.relative(realish(allowed), realish(filePath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function findDanger(command) {
  return DANGEROUS.find(({ re }) => re.test(command)) || null;
}

function setMode(args) {
  const root = projectRoot();
  const [mode, target] = args;
  const state = readState(root);
  if (mode === 'cautious') {
    writeState(root, { ...state, cautious: true });
    console.log('SAFE MODE: cautious. Destructive Bash commands ask before running.');
  } else if (mode === 'lockdown' && target) {
    const lockdownPath = path.resolve(root, target);
    writeState(root, { ...state, lockdownPath });
    console.log(`LOCKDOWN ACTIVE: edits restricted to ${lockdownPath}`);
  } else if (mode === 'clear') {
    try { fs.unlinkSync(statePath(root)); } catch (e) {}
    console.log('SAFE MODE: all restrictions cleared.');
  } else {
    console.error('Usage: safe-mode-guard.js set <cautious | lockdown <path> | clear>');
    process.exit(1);
  }
}

async function guard() {
  const input = await readHookInput();
  const state = readState(projectRoot(input));
  const tool = input.tool_name;
  const toolInput = input.tool_input || {};

  if (tool === 'Bash' && state.cautious) {
    const hit = findDanger(toolInput.command || '');
    if (hit) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: `Safe mode: ${hit.label}. Run /safe-mode clear to stop these checks.`,
        },
      }));
    }
    return;
  }

  if ((tool === 'Edit' || tool === 'Write') && state.lockdownPath && toolInput.file_path) {
    const target = path.resolve(projectRoot(input), toolInput.file_path);
    if (!isInside(target, state.lockdownPath)) {
      console.error(`LOCKDOWN ACTIVE: edits restricted to ${state.lockdownPath}. Blocked ${tool} to ${target}. Run /safe-mode clear to lift it.`);
      process.exit(2);
    }
  }
}

module.exports = { findDanger, isInside, statePath };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'set') setMode(rest);
  else guard().catch(() => process.exit(0));
}
