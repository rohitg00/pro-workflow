#!/usr/bin/env node
const PATTERNS = [
  { name: 'AWS Access Key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS Secret Key', re: /\b(?:aws_)?secret(?:_access)?_key\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}["']?/i },
  { name: 'GitHub Token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'GitHub Fine-Grained Token', re: /\bgithub_pat_[A-Za-z0-9_]{82}\b/ },
  { name: 'Anthropic API Key', re: /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/ },
  { name: 'OpenAI API Key', re: /\bsk-(?:proj-)?(?!ant-)[A-Za-z0-9_\-]{20,}\b/ },
  { name: 'Slack Token', re: /\bxox[baprs]-[A-Za-z0-9\-]{10,}\b/ },
  { name: 'Google API Key', re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { name: 'Stripe Secret Key', re: /\bsk_live_[0-9a-zA-Z]{24,}\b/ },
  { name: 'Private Key Block', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'Generic Bearer Token', re: /\bBearer\s+[A-Za-z0-9_\-.=]{30,}/ },
  { name: 'Generic Password Assignment', re: /\b(?:password|passwd|pwd)\s*[=:]\s*["'][^"'\s]{8,}["']/i },
  { name: 'Generic Secret Assignment', re: /\b(?:api[_\-]?key|api[_\-]?secret|secret|token)\s*[=:]\s*["'][A-Za-z0-9_\-]{20,}["']/i },
];

const ALLOWLIST = [
  /example|placeholder|your[_\-]?(?:api[_\-]?)?key|xxx+|\*{4,}|<[A-Z_]+>/i,
  /process\.env\./,
  /os\.getenv|os\.environ/,
];

function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.on('data', c => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function surroundingLine(content, index) {
  const start = content.lastIndexOf('\n', index - 1) + 1;
  const end = content.indexOf('\n', index);
  return content.slice(start, end === -1 ? content.length : end);
}

function scan(content) {
  if (!content) return null;
  for (const { name, re } of PATTERNS) {
    const m = content.match(re);
    if (!m) continue;
    const snippet = m[0];
    const context = surroundingLine(content, m.index);
    if (ALLOWLIST.some(a => a.test(context))) continue;
    const line = content.slice(0, m.index).split('\n').length;
    return { name, snippet: snippet.slice(0, 40), line };
  }
  return null;
}

(async () => {
  const raw = await readStdin();
  let input = {};
  try { input = JSON.parse(raw); } catch {}
  const content = input?.tool_input?.content || input?.tool_input?.new_string || '';
  const path = input?.tool_input?.file_path || '';
  if (/\.(env|pem|key)$|\/secrets?\//i.test(path)) {
    console.error(`[pro-workflow] secret-scan: refusing to write to secret-like path: ${path}`);
    process.exit(2);
  }
  const hit = scan(content);
  if (!hit) process.exit(0);
  console.error(`[pro-workflow] secret-scan: detected ${hit.name} near line ${hit.line}: ${hit.snippet}... — remove or load from env.`);
  process.exit(2);
})();
