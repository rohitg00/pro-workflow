#!/usr/bin/env node
const GIT_PREFIX = /\bgit(?:\s+(?:-[cC]\s+\S+|--\S+(?:=\S+)?|-[a-zA-Z]+))*\s+/;

function sub(pattern) {
  return new RegExp(GIT_PREFIX.source + pattern.source);
}

const BLOCK = [
  { name: 'force push (--force / -f)',           re: sub(/push\s+(?:[^\s]+\s+)*(?:-f\b|--force\b)(?!-with-lease)/) },
  { name: 'force push (refspec +branch)',        re: sub(/push\s+\S+\s+\+[^\s]+/) },
  { name: 'remote branch delete (refspec :ref)', re: sub(/push\s+\S+\s+:[^\s]+/) },
  { name: 'remote branch delete (--delete)',     re: sub(/push\s+(?:[^\s]+\s+)*--delete\b/) },
  { name: 'hard reset',                          re: sub(/reset\s+(?:[^\s]+\s+)*--hard\b/) },
  { name: 'working-tree clean',                  re: sub(/clean\s+(?:[^\s]*f)/) },
  { name: 'branch deletion (-D)',                re: sub(/branch\s+(?:[^\s]+\s+)*-D\b/) },
  { name: 'checkout discard (.)',                re: sub(/checkout\s+(?:--\s+)?\.\s*$/) },
  { name: 'restore discard (.)',                 re: sub(/restore\s+(?:[^\s]+\s+)*\.\s*$/) },
  { name: 'interactive rebase on protected branch', re: sub(/rebase\s+(?:[^\s]+\s+)*-i\b.*\b(?:main|master|trunk|release\/)/) },
  { name: 'history rewrite (filter-branch)',     re: sub(/filter-branch\b/) },
  { name: 'reflog expire',                       re: sub(/reflog\s+expire\b/) },
  { name: 'ref deletion',                        re: sub(/update-ref\s+-d\b/) },
  { name: 'stash drop/clear',                    re: sub(/stash\s+(?:drop|clear)\b/) },
];

const WARN_NOT_BLOCK = [
  { name: 'force-with-lease push', re: sub(/push\s+(?:[^\s]+\s+)*--force-with-lease\b/) },
];

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function redact(command) {
  return command.replace(/(https?:\/\/)[^/@\s]+@/gi, '$1***@');
}

(async () => {
  if (process.env.PRO_WORKFLOW_ALLOW_UNSAFE_GIT === '1') process.exit(0);
  const raw = await readStdin();
  let input = {};
  try { input = JSON.parse(raw); } catch {}
  const command = (input?.tool_input?.command || '').trim();
  if (!command || !/^(?:.*\s)?git\b/.test(command)) process.exit(0);
  const safe = redact(command);

  for (const { name, re } of BLOCK) {
    if (re.test(command)) {
      console.error(`[pro-workflow] git-blast-radius: blocked "${name}". Command: ${safe}`);
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
