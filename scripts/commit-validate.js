#!/usr/bin/env node
const TYPES = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'perf', 'ci', 'style', 'build', 'revert'];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([\\w\\-.,/ ]+\\))?!?: .+`);
const MAX_SUMMARY = 72;

// A real `git … commit` invocation, i.e. `git` as the command word of a shell
// segment with `commit` as its subcommand.
//
//   (?:^|[\n;&|(`])          start of a command segment, so `echo git commit`
//                            and `echo 'git commit'` are not invocations
//   (?:\w+=\S*\s+|sudo…)*    the few prefixes that still leave git the command
//   git\s+                   the command word itself
//   (?:-\S+(?:\s+[^-\s]\S*)?\s+)*   only flags, each with an optional value, so
//                            `git -C /path commit` and `git -c k=v commit` match
//                            while `git log commit` does not
const GIT_COMMIT = /(?:^|[\n;&|(`])\s*(?:\w+=\S*\s+|sudo\s+|command\s+)*git\s+(?:-\S+(?:\s+[^-\s]\S*)?\s+)*commit\b/;

// The arguments belonging to that commit: everything after the `commit` verb up
// to the first shell separator that is not inside quotes, so a later `&& python
// -m pytest` is not mistaken for the message. A heredoc body may legally contain
// separators, so once one is opened the arguments run to the end of the command.
function commitArgs(rest) {
  let single = false;
  let double = false;
  let heredoc = false;

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

  // None of the sub-patterns below (-m, --message, heredoc, -F/--file) are
  // specific to git — they match any command carrying those tokens. So first
  // require a real `git … commit`, then scan only the text that FOLLOWS the
  // `commit` verb. Both halves matter: the guard is what stops `python -m
  // pytest` or `cat > f <<'EOF' … EOF` being read as a commit message, and the
  // slice is what stops the stray `-m` in `python -m pytest && git commit -m
  // "feat: x"` from being picked up instead of the real one.
  const gitCommit = command.match(GIT_COMMIT);
  if (!gitCommit) return { msg: null, form: 'not-a-commit' };
  const args = commitArgs(command.slice(gitCommit.index + gitCommit[0].length));

  const shortFlag = args.match(/(?:^|\s)-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (shortFlag) {
    const raw = shortFlag[1] || shortFlag[2] || shortFlag[3] || '';
    return { msg: raw.replace(/\\"/g, '"').replace(/\\'/g, "'"), form: '-m' };
  }

  const longFlag = args.match(/--message(?:=|\s+)(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/);
  if (longFlag) {
    const raw = longFlag[1] || longFlag[2] || longFlag[3] || '';
    return { msg: raw.replace(/\\"/g, '"').replace(/\\'/g, "'"), form: '--message' };
  }

  const heredocAny = args.match(/<<-?\s*'?([A-Za-z_][A-Za-z0-9_]*)'?\s*\n([\s\S]*?)\n\s*\1\s*$/m);
  if (heredocAny) return { msg: heredocAny[2].split('\n')[0], form: 'heredoc' };

  if (/(?:^|\s)-F(?:\s+\S+|=\S+)/.test(args) || /--file(?:=|\s+)\S+/.test(args)) {
    return { msg: null, form: 'file' };
  }

  // Reached only when the command IS a git commit (the guard above returned
  // otherwise), so no second `git commit` test is needed here.
  const hasExplicitFlag = /(?:-m|--message|-F|--file|--amend)\b/.test(args);
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
