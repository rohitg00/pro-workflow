#!/usr/bin/env node
const TYPES = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf', 'ci', 'style', 'build', 'revert'];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([\\w\\-.,/ ]+\\))?!?: .+`);
const MAX_SUMMARY = 72;

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function extractMessage(command) {
  if (!command) return { msg: null, form: 'empty' };

  const shortFlag = command.match(/(?:^|\s)-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (shortFlag) {
    const raw = shortFlag[1] || shortFlag[2] || shortFlag[3] || '';
    return { msg: raw.replace(/\\"/g, '"').replace(/\\'/g, "'"), form: '-m' };
  }

  const longFlag = command.match(/--message(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (longFlag) {
    const raw = longFlag[1] || longFlag[2] || longFlag[3] || '';
    return { msg: raw.replace(/\\"/g, '"').replace(/\\'/g, "'"), form: '--message' };
  }

  const heredocAny = command.match(/<<-?\s*'?([A-Za-z_][A-Za-z0-9_]*)'?\s*\n([\s\S]*?)\n\s*\1\s*$/m);
  if (heredocAny) return { msg: heredocAny[2].split('\n')[0], form: 'heredoc' };

  if (/(?:^|\s)-F(?:\s+\S+|=\S+)/.test(command) || /--file(?:=|\s+)\S+/.test(command)) {
    return { msg: null, form: 'file' };
  }

  if (/\bgit\s+(?:-[^\s]+\s+)*commit\b/.test(command)) {
    const afterCommit = command.split(/\bcommit\b/)[1] || '';
    const hasExplicitFlag = /(?:-m|--message|-F|--file|--amend)\b/.test(afterCommit);
    if (!hasExplicitFlag) return { msg: null, form: 'editor' };
    return { msg: null, form: 'unknown' };
  }

  return { msg: null, form: 'empty' };
}

function validate(msg) {
  const firstLine = msg.split('\n')[0].trim();
  if (!PATTERN.test(firstLine)) {
    return { ok: false, reason: `Commit message must follow conventional commits: <type>(<scope>): <summary>. Valid types: ${TYPES.join(', ')}.` };
  }
  const summary = firstLine.split(':').slice(1).join(':').trim();
  if (summary.length > MAX_SUMMARY) {
    return { ok: false, reason: `Commit summary is ${summary.length} chars, must be <= ${MAX_SUMMARY}.` };
  }
  return { ok: true };
}

(async () => {
  const raw = await readStdin();
  let input = {};
  try { input = JSON.parse(raw); } catch {}
  const command = input?.tool_input?.command || '';
  const { msg, form } = extractMessage(command);

  if (msg === null) {
    if (form === 'file' || form === 'editor') process.exit(0);
    if (form === 'unknown') {
      console.error(`[pro-workflow] commit-validate: could not parse commit message from command; skipping validation. Review before pushing.`);
      process.exit(0);
    }
    process.exit(0);
  }

  const result = validate(msg);
  if (result.ok) process.exit(0);
  console.error(`[pro-workflow] commit-validate: ${result.reason}`);
  process.exit(2);
})();
