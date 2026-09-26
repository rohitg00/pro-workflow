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

const CAT_HEREDOC = /^\$\(\s*cat\s+<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n([\s\S]*?)\n\s*\2\s*\n?\s*\)/;
const OPERATORS = new Set([';', '&', '|', '\n', '(', ')']);
const GIT_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const REUSED_MESSAGE = /^(?:--fixup|--squash|--reuse-message|--reedit-message|-C|-c)(?:=|$)/;

function readSubstitution(src, i) {
  const heredoc = src.slice(i).match(CAT_HEREDOC);
  if (heredoc) return i + heredoc[0].length;
  let depth = 0;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') { j++; continue; }
    if (c === "'") { j = src.indexOf("'", j + 1); if (j < 0) return src.length; continue; }
    if (c === '(') depth++;
    if (c === ')' && --depth === 0) return j + 1;
  }
  return src.length;
}

function tokenize(src) {
  const segments = [];
  let seg = { tokens: [], heredocs: [] };
  let token = null;
  let pending = [];
  const endToken = () => { if (token !== null) seg.tokens.push(token); token = null; };
  const endSegment = () => { endToken(); if (seg.tokens.length) segments.push(seg); seg = { tokens: [], heredocs: [] }; };
  const append = s => { token = (token ?? '') + s; };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { append(src[i + 1] ?? ''); i++; continue; }
    if (c === "'") {
      const end = src.indexOf("'", i + 1);
      const stop = end < 0 ? src.length : end;
      append(src.slice(i + 1, stop));
      i = stop;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let out = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && '"\\$`'.includes(src[j + 1])) { out += src[j + 1]; j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '(') { const end = readSubstitution(src, j); out += src.slice(j, end); j = end; continue; }
        out += src[j++];
      }
      append(out);
      i = j;
      continue;
    }
    if (c === '$' && src[i + 1] === '(') { const end = readSubstitution(src, i); append(src.slice(i, end)); i = end - 1; continue; }
    if (c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') {
      endToken();
      const m = src.slice(i).match(/^<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
      if (m) { pending.push({ delim: m[2], owner: seg }); i += m[0].length - 1; continue; }
    }
    if (c === '#' && token === null) { while (i + 1 < src.length && src[i + 1] !== '\n') i++; continue; }
    if (c === '\n' && pending.length) {
      endSegment();
      let j = i + 1;
      for (const { delim, owner } of pending) {
        const lines = [];
        while (j < src.length) {
          const nl = src.indexOf('\n', j);
          const line = src.slice(j, nl < 0 ? src.length : nl);
          j = nl < 0 ? src.length : nl + 1;
          if (line.trim() === delim) break;
          lines.push(line);
        }
        owner.heredocs.push(lines.join('\n'));
      }
      pending = [];
      i = j - 1;
      continue;
    }
    if (OPERATORS.has(c)) { endSegment(); continue; }
    if (/\s/.test(c)) { endToken(); continue; }
    append(c);
  }
  endSegment();
  return segments;
}

function findCommit(segments) {
  for (const { tokens, heredocs } of segments) {
    let i = 0;
    while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
    if (!tokens[i] || !/(?:^|\/)git$/.test(tokens[i])) continue;
    i++;
    while (i < tokens.length && tokens[i].startsWith('-')) i += GIT_OPTS_WITH_VALUE.has(tokens[i]) ? 2 : 1;
    if (tokens[i] === 'commit') return { args: tokens.slice(i + 1), heredoc: heredocs[0] ?? null };
  }
  return null;
}

function fromValue(value) {
  const heredoc = value.match(CAT_HEREDOC);
  if (heredoc) return { msg: heredoc[3].split('\n')[0], form: 'heredoc' };
  if (/\$\(|`/.test(value)) return { msg: null, form: 'unknown' };
  return { msg: value, form: '-m' };
}

function extractMessage(command) {
  if (!command) return { msg: null, form: 'empty' };
  const commit = findCommit(tokenize(command));
  if (!commit) return { msg: null, form: 'empty' };
  const { args, heredoc } = commit;

  if (args.some(a => REUSED_MESSAGE.test(a))) return { msg: null, form: 'unknown' };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--message' || /^-[a-zA-Z]*m$/.test(a)) return args[i + 1] === undefined ? { msg: null, form: 'unknown' } : fromValue(args[i + 1]);
    if (a.startsWith('--message=')) return fromValue(a.slice('--message='.length));
    if (/^-m./.test(a)) return fromValue(a.slice(2));
    const file = a === '-F' || a === '--file' ? args[i + 1] : a.match(/^(?:-F|--file=)(.+)$/)?.[1];
    if (file === '-') return heredoc === null ? { msg: null, form: 'unknown' } : { msg: heredoc.split('\n')[0], form: 'heredoc' };
    if (file !== undefined) return { msg: null, form: 'file' };
  }

  if (args.some(a => a === '--amend' || a === '--no-edit')) return { msg: null, form: 'unknown' };
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
