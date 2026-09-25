'use strict';
// Contract tests for scripts/commit-validate.js.
//
// The hook's real contract is a process contract, not a function one: Claude Code
// pipes a PreToolUse JSON payload on stdin and reads the exit code, where 2 blocks
// the Bash call and 0 lets it through. These tests drive the script exactly that
// way, so they cover the wiring (stdin parsing, exit codes) as well as the regexes.
//
// Two failure directions matter, and they pull against each other:
//   * blocking a command that is not a commit at all  -> the hook eats unrelated work
//   * failing to block a bad message                  -> the hook silently stops working
// Every guard added here must keep the "still blocks" cases red-if-broken, otherwise
// a false-positive fix can quietly turn validation off instead of narrowing it.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'commit-validate.js');
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

describe('commit-validate: commands that are not a git commit', () => {
  const cases = [
    ['unrelated -m flag on a python module', 'python -m pytest tests/ -q'],
    ['-m flag nested in a docker invocation', 'docker compose run --rm -T web python -m ruff check .'],
    ['-m flag passed through npm', 'npm run build -- -m foo'],
    ['heredoc writing a file', "cat > file.py <<'EOF'\nimport json\nEOF"],
    ['heredoc piped into an interpreter', "python3 - <<'PY'\nprint('hello')\nPY"],
    ['heredoc piped into psql', "psql -U u -d d <<'SQL'\nSELECT 1;\nSQL"],
    ['heredoc sent over ssh', "ssh host <<'EOF'\nuptime\nEOF"],
    ['the word commit only as grep input', 'git log --oneline -5 | grep commit'],
    ['a quoted mention of git commit', "echo 'git commit' && python -m pytest"],
    ['an unquoted mention of git commit', 'echo git commit -m "bad message not conventional"'],
    ['commit as an argument to another subcommand', 'git log commit -m "bad message not conventional"'],
  ];

  for (const [why, command] of cases) {
    test(`allows ${why}`, () => assertAllows(command, why));
  }
});

describe('commit-validate: a real commit preceded by an unrelated -m', () => {
  // Regression guard: the message must be read from after the `commit` verb.
  // Scanning the whole command line picks up the earlier flag's value instead
  // (`pytest`, `ruff`), which fails validation and blocks a perfectly good commit.
  test('allows a valid commit after python -m pytest', () =>
    assertAllows('python -m pytest && git commit -m "feat: add the thing"', 'valid message after a stray -m'));

  test('allows a valid commit after a docker python -m run', () =>
    assertAllows('docker compose run -T web python -m ruff check . && git commit -m "fix(x): tidy"', 'valid message after a stray -m'));

  test('still blocks an invalid commit after python -m pytest', () =>
    assertBlocks('python -m pytest && git commit -m "bad message not conventional"', 'invalid message after a stray -m'));
});

describe('commit-validate: still blocks invalid messages', () => {
  const cases = [
    ['plain invocation', 'git commit -m "bad message not conventional"'],
    ['summary over the length cap', `git commit -m "feat: ${LONG_SUMMARY}"`],
    // `git -C <path>` and `git -c <k>=<v>` put a non-flag token between `git` and
    // `commit`; a guard that only allows a run of flags there stops matching, and
    // then silently skips validation for these very common forms.
    ['git -C <path> form', 'git -C /tmp/repo commit -m "bad message not conventional"'],
    ['git -c <key>=<value> form', 'git -c user.email=a@b.c commit -m "bad message not conventional"'],
    ['git --git-dir form', 'git --git-dir=/tmp/r/.git commit -m "bad message not conventional"'],
    ['after a cd in the same command', 'cd /tmp/repo && git commit -m "bad message not conventional"'],
    ['behind sudo', 'sudo git commit -m "bad message not conventional"'],
    ['amend with a message', 'git commit --amend -m "bad message not conventional"'],
    ['--message= form', 'git commit --message="bad message not conventional"'],
    ['message supplied by heredoc', "git commit -F- <<'EOF'\nbad message not conventional\nEOF"],
    // A heredoc body may contain shell separators; they must not truncate it.
    ['heredoc message containing separators', "git commit -F- <<'EOF'\nbad message; not & conventional\nEOF"],
  ];

  for (const [why, command] of cases) {
    test(`blocks ${why}`, () => assertBlocks(command, why));
  }
});

describe('commit-validate: lets valid commits through', () => {
  const cases = [
    ['conventional message with scope', 'git commit -m "feat(scope): add thing"'],
    ['conventional message via git -C', 'git -C /tmp/repo commit -m "fix(api): handle null"'],
    ['conventional message via heredoc', "git commit -F- <<'EOF'\nfeat(x): valid heredoc subject\nEOF"],
    ['message read from a file', 'git commit -F /tmp/msg.txt'],
    ['message written in the editor', 'git commit'],
    ['valid commit followed by another command', 'git commit -m "chore: bump" && python -m pytest'],
    // The message comes from the editor here; the -m belongs to the chained
    // command, so extraction must stop at the separator rather than read it.
    ['editor commit chained before a -m command', 'git commit && python -m pytest'],
    ['editor commit chained before a heredoc', "git commit && cat > f.py <<'EOF'\nimport json\nEOF"],
    ['a message containing shell separators', 'git commit -m "fix(api): guard a & b; retry"'],
  ];

  for (const [why, command] of cases) {
    test(`allows ${why}`, () => assertAllows(command, why));
  }
});

describe('commit-validate: degenerate input', () => {
  test('allows an empty command', () => assertAllows('', 'empty command'));

  test('does not crash on malformed stdin', () => {
    const res = spawnSync(process.execPath, [SCRIPT], { input: 'not json at all', encoding: 'utf8' });
    assert.strictEqual(res.status, 0, 'malformed payload should be ignored, not fatal');
  });
});
