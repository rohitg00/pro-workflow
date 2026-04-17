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
  if (!command) return null;
  const mFlag = command.match(/-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (mFlag) return (mFlag[1] || mFlag[2] || mFlag[3] || '').replace(/\\"/g, '"').replace(/\\'/g, "'");
  const heredoc = command.match(/<<'?EOF'?\s*\n([\s\S]*?)\nEOF/);
  if (heredoc) return heredoc[1].split('\n')[0];
  return null;
}

function validate(msg) {
  if (!msg) return { ok: true };
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
  const msg = extractMessage(command);
  const result = validate(msg);
  if (result.ok) {
    process.exit(0);
  }
  console.error(`[pro-workflow] commit-validate: ${result.reason}`);
  process.exit(2);
})();
