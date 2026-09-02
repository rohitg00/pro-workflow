#!/usr/bin/env node
const TYPES = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf', 'ci', 'style', 'build', 'revert'];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([\\w\\-.,/ ]+\\))?!?: .+`);
const MAX_SUMMARY = 72;

// A real `git … commit`: `git` as the command word of a shell segment.
//
//   SEGMENT   start of a command, so `echo git commit …` is not an invocation
//   WRAPPER   prefixes that still leave git the command being run. Leaving these
//             out silently disables validation inside if/for/while bodies and
//             behind nice/timeout/env/xargs, which is worse than a false
//             positive because nothing reports it.
//   GITWORD   git by name or by path (/usr/bin/git, ~/bin/git)
//   then any global options, including the separate argument -c/-C takes
//   (`git -c user.name=x commit`, `git -C /path commit`), then `commit`.
const SEGMENT = '(?:^|[\\n;&|(){}`])';
const WRAPPER = '(?:\\w+=\\S*|then|else|elif|do|exec|eval|time|nohup|setsid|command|sudo|doas|env' +
  '|nice(?:\\s+-n\\s+\\S+)?|stdbuf(?:\\s+-\\S+)*|timeout(?:\\s+\\S+)?' +
  '|xargs(?:\\s+-\\S+(?:\\s+[^-\\s]\\S*)?)*)';
const GITWORD = '(?:[\\w./~-]*/)?git';
const GIT_COMMIT = new RegExp(
  SEGMENT + '\\s*(?:' + WRAPPER + '\\s+)*' + GITWORD +
  '\\s+(?:(?:-[cC]\\s+\\S+|-{1,2}[^\\s]+)\\s+)*commit\\b'
);
const HEREDOC_MARKER = /<<-?\s*(?:'([A-Za-z_][A-Za-z0-9_]*)'|"([A-Za-z_][A-Za-z0-9_]*)"|\\?([A-Za-z_][A-Za-z0-9_]*))/g;
const SHELL_C = /(?:^|[\s;&|(])(?:ba|z|k|da)?sh\s+-c\s+(['"])/g;

// Separate shell code from heredoc bodies. Body text is data, not command: a
// notes file written with `cat > x.md <<'EOF'` may quote `git commit -m "…"`
// without that being a commit anyone is running.
function splitHeredocs(command) {
  const code = [];
  const bodies = new Map();
  const queue = [];
  let active = null;
  let quote = null;

  for (const line of command.split('\n')) {
    if (active) {
      if (line.trim() === active.tag) {
        bodies.set(active.tag, active.body.join('\n'));
        active = queue.length ? { tag: queue.shift(), body: [] } : null;
      } else {
        active.body.push(line);
      }
      continue;
    }
    code.push(line);
    // Only openers in code position count. A `<<'EOF'` inside a quoted string —
    // a commit message that merely mentions a heredoc — is data, and treating it
    // as an opener would swallow the rest of the command as a body. Quote state
    // carries across lines because a quoted argument may span them.
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '\\' && quote !== "'") { i++; continue; }
      if (quote === null && (c === "'" || c === '"')) { quote = c; continue; }
      if (quote !== null) { if (c === quote) quote = null; continue; }
      if (c === '<' && line[i + 1] === '<') {
        HEREDOC_MARKER.lastIndex = i;
        const m = HEREDOC_MARKER.exec(line);
        if (m && m.index === i) { queue.push(m[1] || m[2] || m[3]); i = HEREDOC_MARKER.lastIndex - 1; }
      }
    }
    if (queue.length) active = { tag: queue.shift(), body: [] };
  }
  if (active) bodies.set(active.tag, active.body.join('\n')); // unterminated heredoc

  return { code: code.join('\n'), bodies };
}

// Quoted text is data too: `echo 'git commit -m "x"'` and
// `gh pr create --body "… git commit …"` run no commit. Mask quoted spans
// (length-preserving, so indices still line up with `code`), then put back the
// payload of `sh -c '…'`, which really is code, and mark its opening quote as a
// segment start so the command word inside it is recognised.
function maskQuoted(code) {
  const out = code.split('');
  let quote = null;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote === null && (c === "'" || c === '"')) { quote = c; continue; }
    if (quote !== null) { if (c === quote) { quote = null; continue; } out[i] = ' '; }
  }
  let m;
  SHELL_C.lastIndex = 0;
  while ((m = SHELL_C.exec(code)) !== null) {
    const start = m.index + m[0].length;
    const end = code.indexOf(m[1], start);
    const stop = end === -1 ? code.length : end;
    out[start - 1] = ';';
    for (let i = start; i < stop; i++) out[i] = code[i];
  }
  return out.join('');
}

// The arguments belonging to THIS commit: text after the `commit` verb up to the
// first unquoted shell separator, so a chained `&& python -m pytest` cannot
// supply the message. A message may legally contain `;` `&` `|` inside quotes,
// and a heredoc body may contain them unquoted, so once a heredoc is opened the
// arguments run to the end.
function commitArgs(rest) {
  let single = false, double = false, heredoc = false;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === '\\' && !single) { i++; continue; }
    if (c === "'" && !double) { single = !single; continue; }
    if (c === '"' && !single) { double = !double; continue; }
    if (single || double) continue;
    if (c === '<' && rest[i + 1] === '<') { heredoc = true; i++; continue; }
    if (!heredoc && (c === ';' || c === '&' || c === '|')) return rest.slice(0, i);
  }
  return rest;
}

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

  const { code, bodies } = splitHeredocs(command);

  // None of the sub-patterns below (-m, --message, heredoc, -F/--file) are
  // git-specific — they match any command carrying those tokens. Require a real
  // `git … commit` first, looking only at code with quoted data masked out.
  const gitCommit = maskQuoted(code).match(GIT_COMMIT);
  if (!gitCommit) return { msg: null, form: 'not-a-commit' };

  // Everything the commit itself could be carrying lives after the `commit` word.
  const afterCommit = commitArgs(code.slice(gitCommit.index + gitCommit[0].length));

  const shortFlag = afterCommit.match(/(?:^|\s)-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (shortFlag) {
    const raw = shortFlag[1] || shortFlag[2] || shortFlag[3] || '';
    return { msg: raw.replace(/\\"/g, '"').replace(/\\'/g, "'"), form: '-m' };
  }

  const longFlag = afterCommit.match(/--message(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (longFlag) {
    const raw = longFlag[1] || longFlag[2] || longFlag[3] || '';
    return { msg: raw.replace(/\\"/g, '"').replace(/\\'/g, "'"), form: '--message' };
  }

  // A heredoc is the commit message only when the commit reads it from stdin
  // (`-F -`, `-F-`, `--file=-`). Any other heredoc belongs to another command.
  const readsStdin = /(?:^|\s)-F\s*-(?=\s|$)/.test(afterCommit) || /--file(?:=|\s+)-(?=\s|$)/.test(afterCommit);
  if (readsStdin) {
    HEREDOC_MARKER.lastIndex = 0;
    const marker = HEREDOC_MARKER.exec(afterCommit);
    const tag = marker && (marker[1] || marker[2] || marker[3]);
    if (tag && bodies.has(tag)) return { msg: bodies.get(tag).split('\n')[0], form: 'heredoc' };
  }

  if (/(?:^|\s)-F(?:\s+\S+|=\S+)/.test(afterCommit) || /--file(?:=|\s+)\S+/.test(afterCommit)) {
    return { msg: null, form: 'file' };
  }

  const hasExplicitFlag = /(?:-m|--message|-F|--file|--amend)\b/.test(afterCommit);
  if (!hasExplicitFlag) return { msg: null, form: 'editor' };
  return { msg: null, form: 'unknown' };
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
