'use strict';
// Contract tests for scripts/commit-validate.js.
//
// The hook's real contract is a process contract, not a function one: Claude Code
// pipes a PreToolUse JSON payload on stdin and reads the exit code, where 2 blocks
// the Bash call and 0 lets it through. These tests drive the script exactly that
// way, so they cover the wiring (stdin parsing, exit codes) as well as the regexes.
// (Harness shape follows the one proposed in #87.)
//
// Two failure directions matter, and they pull against each other:
//   * blocking a command that is not a commit at all  -> the hook eats unrelated work
//   * failing to block a bad message                  -> the hook silently stops working
// The second is the dangerous one: nothing reports it, so the hook looks healthy
// while validation is off. Every guard added here must keep the "still blocks"
// cases red-if-broken, otherwise a false-positive fix quietly turns validation off
// instead of narrowing it. That is why the wrapper/keyword table below is long.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'commit-validate.js');
const BAD = 'bad message not conventional';
const LONG_SUMMARY = 'x'.repeat(80); // > MAX_SUMMARY (72)

function runHook(command) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  });
  return { code: res.status, stderr: res.stderr || '' };
}

function assertAllows(command, why) {
  const { code, stderr } = runHook(command);
  assert.strictEqual(code, 0, `expected exit 0 (allow) for ${why}\ncommand: ${command}\nstderr: ${stderr}`);
}

function assertBlocks(command, why) {
  const { code } = runHook(command);
  assert.strictEqual(code, 2, `expected exit 2 (block) for ${why}\ncommand: ${command}`);
}

function table(title, cases, assertion) {
  describe(title, () => {
    for (const [why, command] of cases) test(`${assertion === assertAllows ? 'allows' : 'blocks'} ${why}`, () => assertion(command, why));
  });
}

// --- not a commit at all: flags and heredocs that belong to other commands ---
table('commit-validate: commands that are not a git commit', [
  ['unrelated -m flag on a python module', 'python -m pytest tests/ -q'],
  ['-m flag nested in a docker invocation', 'docker compose run --rm -T web python -m ruff check .'],
  ['curl max-time (#82)', 'curl -sS -m 4 http://localhost:8643/health'],
  ['ffmpeg -m', 'ffmpeg -m 3 -i in.mp4 out.mp4'],
  ['-m flag passed through npm', 'npm run build -- -m foo'],
  ['heredoc writing a file', "cat > file.py <<'EOF'\nimport json\nEOF"],
  ['heredoc piped into an interpreter', "python3 - <<'PY'\nprint('hello')\nPY"],
  ['heredoc piped into psql', "psql -U u -d d <<'SQL'\nSELECT 1;\nSQL"],
  ['heredoc sent over ssh', "ssh host <<'EOF'\nuptime\nEOF"],
  ['the word commit only as grep input', 'git log --oneline -5 | grep commit'],
  ['commit as an argument to another subcommand', `git log commit -m "${BAD}"`],
  ['git commit-graph, a different subcommand', 'git commit-graph write'],
], assertAllows);

// --- heredoc bodies are data, not command ---
table('commit-validate: heredoc bodies are data', [
  ['a notes file quoting an invalid commit', `cat > notes.md <<'EOF'\ngit commit -m "${BAD}"\nEOF`],
  ['a rules file quoting a valid commit', "cat > CLAUDE.md <<'EOF'\ngit commit -m \"feat: x\"\nEOF"],
  ['a shell script that itself commits', `cat > release.sh <<'EOF'\n#!/bin/sh\ngit commit -m "${BAD}"\nEOF`],
  ['an unterminated heredoc', `cat > notes.md <<'EOF'\ngit commit -m "${BAD}"`],
], assertAllows);

// --- quoted arguments are data, not command ---
table('commit-validate: quoted arguments are data', [
  ['a single-quoted mention', `echo 'git commit -m "${BAD}"'`],
  ['a mention inside node -e', `node -e 'const x = "git commit -m \\"${BAD}\\""'`],
  ['a mention inside python3 -c', `python3 -c 'print("git commit -m ${BAD}")'`],
  ['a mention in a PR body', `gh pr create --body "then run git commit -m \\"${BAD}\\""`],
  ['a mention passed to printf', `printf '%s\\n' 'git commit -m "${BAD}"'`],
], assertAllows);

// --- the guard must not become a bypass: git is still the command being run ---
table('commit-validate: still blocks behind wrappers and keywords', [
  ['plain invocation', `git commit -m "${BAD}"`],
  ['after a cd in the same command', `cd /tmp/repo && git commit -m "${BAD}"`],
  ['behind sudo', `sudo git commit -m "${BAD}"`],
  ['with an environment assignment', `GIT_AUTHOR_NAME=x git commit -m "${BAD}"`],
  ['behind env', `env FOO=1 git commit -m "${BAD}"`],
  ['behind time', `time git commit -m "${BAD}"`],
  ['behind nice', `nice git commit -m "${BAD}"`],
  ['behind timeout', `timeout 30 git commit -m "${BAD}"`],
  ['behind nohup', `nohup git commit -m "${BAD}"`],
  ['behind exec', `exec git commit -m "${BAD}"`],
  ['behind xargs', `echo x | xargs -I{} git commit -m "${BAD}"`],
  ['called by absolute path', `/usr/bin/git commit -m "${BAD}"`],
  ['called by a path under home', `~/bin/git commit -m "${BAD}"`],
  ['in an if body', `if true; then git commit -m "${BAD}"; fi`],
  ['in a for body', `for f in a b; do git commit -m "${BAD}"; done`],
  ['in a while body', `while false; do git commit -m "${BAD}"; done`],
  ['in a case body', `case x in *) git commit -m "${BAD}";; esac`],
  ['in a brace group', `{ git commit -m "${BAD}"; }`],
  ['in a subshell', `( git commit -m "${BAD}" )`],
  ['in a function body', `f() { git commit -m "${BAD}"; }; f`],
  ['inside sh -c, which is code not data', `bash -c 'git commit -m "${BAD}"'`],
  ['on its own line after a preamble', `set -e\n  git commit -m "${BAD}"`],
], assertBlocks);

// --- forms of the message itself ---
table('commit-validate: still blocks invalid messages in every form', [
  ['summary over the length cap', `git commit -m "feat: ${LONG_SUMMARY}"`],
  ['--message= form', `git commit --message="${BAD}"`],
  ['--message with a space', `git commit --message "${BAD}"`],
  // `git -C <path>` and `git -c <k>=<v>` put a non-flag token between `git` and
  // `commit`; a guard that only allows a run of flags there stops matching, and
  // then silently skips validation for these very common forms.
  ['git -C <path> form', `git -C /tmp/repo commit -m "${BAD}"`],
  ['git -c <key>=<value> form', `git -c user.email=a@b.c commit -m "${BAD}"`],
  ['git --git-dir form', `git --git-dir=/tmp/r/.git commit -m "${BAD}"`],
  ['amend with a message', `git commit --amend -m "${BAD}"`],
  ['message supplied by heredoc via -F -', `git commit -F - <<'EOF'\n${BAD}\nEOF`],
  ['message supplied by heredoc via -F-', `git commit -F- <<'EOF'\n${BAD}\nEOF`],
  ['message supplied by heredoc via --file=-', `git commit --file=- <<'EOF'\n${BAD}\nEOF`],
  // A heredoc body may contain shell separators; they must not truncate it.
  ['heredoc message containing separators', `git commit -F- <<'EOF'\nbad message; not & conventional\nEOF`],
  ['an invalid message mentioning a heredoc', `git commit -m "explain cat > x <<'EOF' usage"`],
], assertBlocks);

// --- real commits must keep working ---
table('commit-validate: lets valid commits through', [
  ['conventional message with scope', 'git commit -m "feat(scope): add thing"'],
  ['a breaking-change marker', 'git commit -m "feat(api)!: drop v1"'],
  ['conventional message via git -C', 'git -C /tmp/repo commit -m "fix(api): handle null"'],
  ['conventional message via heredoc', "git commit -F- <<'EOF'\nfeat(x): valid heredoc subject\nEOF"],
  ['message read from a file', 'git commit -F /tmp/msg.txt'],
  ['message written in the editor', 'git commit'],
  ['amend keeping the message', 'git commit --amend --no-edit'],
  ['valid commit followed by another command', 'git commit -m "chore: bump" && python -m pytest'],
  // The message comes from the editor here; the -m belongs to the chained
  // command, so extraction must stop at the separator rather than read it.
  ['editor commit chained before a -m command', 'git commit && python -m pytest'],
  ['editor commit chained before a heredoc', "git commit && cat > f.py <<'EOF'\nimport json\nEOF"],
  // A stray -m earlier in the line must not be read as the commit's message.
  ['a valid commit after python -m pytest', 'python -m pytest && git commit -m "feat: add the thing"'],
  ['a valid commit after a docker python -m run', 'docker compose run -T web python -m ruff check . && git commit -m "fix(x): tidy"'],
  ['a message containing shell separators', 'git commit -m "fix(api): guard a & b; retry"'],
  ['a message containing an apostrophe', `git commit -m "fix(ui): don't crash on empty"`],
  // A heredoc marker inside the message is data. Treating it as a real opener
  // swallows the rest of the command as a body and truncates the message.
  ['a message mentioning a heredoc', `git commit -m "docs(hooks): explain cat > x <<'EOF' usage"`],
  ['a multi-line message mentioning a heredoc', `git commit -m "docs(hooks): explain heredocs\n\nSee cat > notes.md <<'EOF' for the shape."`],
], assertAllows);

describe('commit-validate: degenerate input', () => {
  test('allows an empty command', () => assertAllows('', 'empty command'));

  test('does not crash on malformed stdin', () => {
    const res = spawnSync(process.execPath, [SCRIPT], { input: 'not json at all', encoding: 'utf8' });
    assert.strictEqual(res.status, 0, 'malformed payload should be ignored, not fatal');
  });

  test('does not crash when tool_input is missing', () => {
    const res = spawnSync(process.execPath, [SCRIPT], { input: '{}', encoding: 'utf8' });
    assert.strictEqual(res.status, 0, 'missing tool_input should be ignored, not fatal');
  });

  test('stays silent on an unrelated command', () => {
    const { code, stderr } = runHook('ls -la');
    assert.strictEqual(code, 0);
    assert.strictEqual(stderr, '', 'the hook must not print on every unrelated Bash call');
  });
});
