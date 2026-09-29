const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const LLM_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'FIREWORKS_API_KEY'];
const TASKS = {
  council: { script: 'skills/llm-council/scripts/council.js', keys: [...LLM_KEYS, 'LLM_COUNCIL_API_KEY'] },
  survey: { script: 'skills/survey-generator/scripts/build-survey.js', runtime: 'dist/db/store.js', keys: [...LLM_KEYS, 'LLM_COUNCIL_API_KEY'] },
  embeddings: { script: 'scripts/embed-wiki.js', runtime: 'dist/db/store.js', keys: ['OPENAI_API_KEY', 'VOYAGE_API_KEY'] },
  research: { script: 'skills/wiki-research-loop/scripts/research-loop.js', runtime: 'dist/db/store.js', keys: ['GITHUB_TOKEN'] },
  optimizer: { script: 'scripts/optimize-skill.js', runtime: 'dist/optimizer/trainer.js', keys: LLM_KEYS },
};
const CREDENTIAL = /^(?:(PRO_WORKFLOW_|CLAUDE_PLUGIN_OPTION_))?(ANTHROPIC_API_KEY|OPENAI_API_KEY|OPENROUTER_API_KEY|FIREWORKS_API_KEY|VOYAGE_API_KEY|LLM_COUNCIL_API_KEY|GITHUB_TOKEN|GH_TOKEN|TYPESAFE_API_KEY|LAYA_API_KEY)$/i;
const SAFE_ENV = new Set([
  'PATH', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'TMPDIR', 'TMP', 'TEMP', 'SYSTEMROOT', 'WINDIR', 'LANG',
  'LLM_COUNCIL_BASE_URL', 'LLM_COUNCIL_MODELS', 'LLM_COUNCIL_CHAIRMAN', 'PROWORKFLOW_EMBED_MODEL',
  'WIKI_ROOT', 'CLAUDE_PROJECT_DIR', 'WIKI_LOOP_MAX_PAGES', 'WIKI_LOOP_MAX_DEPTH', 'WIKI_LOOP_BUDGET_USD',
  'SKILL_OPTIMIZER_TIMEOUT_MS',
]);

function fail(text) {
  return { content: [{ type: 'text', text }], isError: true };
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  if (Object.keys(input).some(key => !['task', 'args', 'cwd'].includes(key))) return false;
  if (typeof input.task !== 'string' || !Object.hasOwn(TASKS, input.task)) return false;
  if (!Array.isArray(input.args) || input.args.length > 128) return false;
  if (input.args.some(arg => typeof arg !== 'string' || arg.includes('\0') || arg.length > 32768)) return false;
  if (input.args.reduce((total, arg) => total + Buffer.byteLength(arg), 0) > 131072) return false;
  return input.cwd === undefined || (typeof input.cwd === 'string' && path.isAbsolute(input.cwd) && !input.cwd.includes('\0'));
}

async function runProviderTask(input, { signal, env = process.env, root = ROOT, timeoutMs = 600000, maxOutputBytes = 1048576 } = {}) {
  if (!validateInput(input)) return fail('Invalid task arguments. Choose a listed task, string-array args, and an optional absolute cwd.');
  const task = TASKS[input.task];
  const credentials = [...new Set(Object.entries(env)
    .filter(([name, value]) => CREDENTIAL.test(name) && typeof value === 'string' && value)
    .flatMap(([, value]) => [value, value.trim(), JSON.stringify(value.trim()).slice(1, -1), encodeURIComponent(value.trim())])
    .filter(Boolean))].sort((a, b) => b.length - a.length);
  const redact = text => credentials.reduce((out, value) => out.split(value).join('[REDACTED]'), text);
  if (input.args.some(arg => credentials.some(value => arg.includes(value)))) {
    return fail('Pass credentials through plugin configuration, never tool arguments.');
  }
  if (signal?.aborted) return fail('Provider task cancelled.');
  const cwd = input.cwd || root;
  try {
    if (!fs.statSync(cwd).isDirectory()) return fail('cwd must be an existing directory.');
  } catch {
    return fail('cwd must be an existing directory.');
  }
  const runtime = task.runtime || (input.task === 'council' && input.args.includes('--wiki') ? 'dist/db/store.js' : null);
  if (runtime && !fs.existsSync(path.join(root, runtime))) {
    return fail('Built runtime is missing. Run npm install and npm run build in the pro-workflow plugin directory, then retry.');
  }
  const childEnv = {};
  for (const [name, value] of Object.entries(env)) {
    const match = name.match(CREDENTIAL);
    const configuredKey = match?.[1] && task.keys.includes(match[2].toUpperCase());
    if (SAFE_ENV.has(name.toUpperCase()) || /^LC_[A-Z_]+$/i.test(name) || configuredKey) {
      childEnv[name] = value;
    }
  }

  if (input.task === 'research') childEnv.PRO_WORKFLOW_BUNDLED_FETCHERS_ONLY = '1';

  return new Promise(resolve => {
    let child;
    let timer;
    let killTimer;
    let settled = false;
    let stopReason;
    let bytes = 0;
    const stdout = [];
    const stderr = [];
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      signal?.removeEventListener('abort', cancel);
      resolve(result);
    };
    const stop = reason => {
      if (stopReason || settled) return;
      stopReason = reason;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), 1000);
      killTimer.unref();
    };
    const cancel = () => stop('Provider task cancelled.');
    const collect = target => chunk => {
      if (stopReason) return;
      bytes += chunk.length;
      if (bytes > maxOutputBytes) {
        stdout.length = 0;
        stderr.length = 0;
        stop('Provider task output exceeded the 1 MiB limit. Reduce the task scope and retry.');
        return;
      }
      target.push(chunk);
    };
    try {
      child = spawn(process.execPath, [path.join(root, task.script), ...input.args], {
        cwd,
        env: childEnv,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      finish(fail('Unable to start the provider task. Check the plugin installation and cwd.'));
      return;
    }
    child.stdout.on('data', collect(stdout));
    child.stderr.on('data', collect(stderr));
    child.once('error', () => finish(fail('Unable to start the provider task. Check the plugin installation and cwd.')));
    child.once('close', code => {
      if (stopReason) return finish(fail(stopReason));
      const output = redact(Buffer.concat(stdout).toString('utf8'));
      const diagnostics = redact(Buffer.concat(stderr).toString('utf8'));
      const text = [output, diagnostics].filter(Boolean).join('\n').trim() || (code === 0 ? 'Provider task completed.' : 'Provider task failed.');
      finish({ content: [{ type: 'text', text }], isError: code !== 0 });
    });
    timer = setTimeout(() => stop('Provider task exceeded the 10 minute runtime limit. Reduce the task scope and retry.'), timeoutMs);
    timer.unref();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}

module.exports = { runProviderTask };
