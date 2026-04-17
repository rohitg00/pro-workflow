#!/usr/bin/env node
const BLOCK = [
  { name: 'force push', re: /\bgit\s+push\s+(?:[^\s]+\s+)*(?:-f\b|--force\b)(?!-with-lease)/ },
  { name: 'hard reset', re: /\bgit\s+reset\s+(?:[^\s]+\s+)*--hard\b/ },
  { name: 'working-tree clean', re: /\bgit\s+clean\s+(?:[^\s]*f)/ },
  { name: 'branch deletion (-D)', re: /\bgit\s+branch\s+(?:[^\s]+\s+)*-D\b/ },
  { name: 'checkout discard (.)', re: /\bgit\s+checkout\s+(?:--\s+)?\.\s*$/ },
  { name: 'restore discard (.)', re: /\bgit\s+restore\s+(?:[^\s]+\s+)*\.\s*$/ },
  { name: 'interactive rebase on protected branch', re: /\bgit\s+rebase\s+(?:[^\s]+\s+)*-i\b.*\b(main|master|trunk|release\/)/ },
  { name: 'history rewrite (filter-branch)', re: /\bgit\s+filter-branch\b/ },
  { name: 'reflog expire', re: /\bgit\s+reflog\s+expire\b/ },
  { name: 'ref deletion', re: /\bgit\s+update-ref\s+-d\b/ },
  { name: 'stash drop/clear', re: /\bgit\s+stash\s+(?:drop|clear)\b/ },
];

const WARN_NOT_BLOCK = [
  { name: 'force-with-lease push', re: /\bgit\s+push\s+(?:[^\s]+\s+)*--force-with-lease\b/ },
];

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

(async () => {
  if (process.env.PRO_WORKFLOW_ALLOW_UNSAFE_GIT === '1') process.exit(0);
  const raw = await readStdin();
  let input = {};
  try { input = JSON.parse(raw); } catch {}
  const command = (input?.tool_input?.command || '').trim();
  if (!command || !/^(?:.*\s)?git\s/.test(command)) process.exit(0);

  for (const { name, re } of BLOCK) {
    if (re.test(command)) {
      console.error(`[pro-workflow] git-blast-radius: blocked "${name}". Command: ${command}`);
      console.error(`Override for this shell: export PRO_WORKFLOW_ALLOW_UNSAFE_GIT=1`);
      process.exit(2);
    }
  }
  for (const { name, re } of WARN_NOT_BLOCK) {
    if (re.test(command)) {
      console.error(`[pro-workflow] git-blast-radius: caution — ${name} can still clobber remote refs. Proceeding.`);
    }
  }
  process.exit(0);
})();
