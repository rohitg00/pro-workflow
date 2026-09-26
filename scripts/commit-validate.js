#!/usr/bin/env node
const TYPES = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf', 'ci', 'style', 'build', 'revert'];
const PATTERN = new RegExp(`^(?:\\([A-Z][A-Z0-9]*-\\d+\\) )?(${TYPES.join('|')})(\\([\\w\\-.,/ ]+\\))?!?: .+`);
const MAX_SUMMARY = 72;

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

const GIT_COMMIT = /(?:^|[\s;&|(])git(?:\s+(?:-C|-c)\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit(?=\s|$)/m;
const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n([\s\S]*?)\n\s*\2\s*(?:\n|$)/;

function heredocFirstLine(text) {
  const m = text.match(HEREDOC);
  return m ? m[3].split('\n')[0] : null;
}

function unquote(match) {
  const raw = match[1] ?? match[2] ?? match[3] ?? '';
  return raw.replace(/\\"/g, '"').replace(/\\'/g, "'");
}

function extractMessage(command) {
  if (!command) return { msg: null, form: 'empty' };

  const commit = command.match(GIT_COMMIT);
  if (!commit) return { msg: null, form: 'empty' };
  const args = command.slice(commit.index + commit[0].length);

  const flag = args.match(/(?:^|\s)(?:-[a-zA-Z]*m|--message(?==|\s))[=\s]*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (flag) {
    const msg = unquote(flag);
    if (/^\$\(\s*cat\s+<</.test(msg)) {
      const body = heredocFirstLine(msg);
      return body === null ? { msg: null, form: 'unknown' } : { msg: body, form: 'heredoc' };
    }
    return { msg, form: '-m' };
  }

  if (/(?:^|\s)(?:-F\s*-|--file(?:=|\s+)-)(?=\s|$)/.test(args)) {
    const body = heredocFirstLine(args);
    return body === null ? { msg: null, form: 'unknown' } : { msg: body, form: 'heredoc' };
  }

  if (/(?:^|\s)(?:-F|--file)(?:=|\s*)\S/.test(args)) return { msg: null, form: 'file' };
  if (/(?:^|\s)(?:--amend|--no-edit|-C|-c|--reuse-message|--fixup|--squash)\b/.test(args)) return { msg: null, form: 'unknown' };

  return { msg: null, form: 'editor' };
}

function validate(msg) {
  const firstLine = msg.split('\n')[0].trim();
  if (!PATTERN.test(firstLine)) {
    return { ok: false, reason: `Commit message must follow conventional commits: [(TICKET-123) ]<type>(<scope>): <summary>. Valid types: ${TYPES.join(', ')}.` };
  }
  const summary = firstLine.split(':').slice(1).join(':').trim();
  if (summary.length > MAX_SUMMARY) {
    return { ok: false, reason: `Commit summary is ${summary.length} chars, must be <= ${MAX_SUMMARY}.` };
  }
  return { ok: true };
}

module.exports = { extractMessage, validate };

if (require.main === module) (async () => {
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
