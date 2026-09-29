const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scriptPath = path.join(__dirname, '..', '..', 'skills', 'wiki-research-loop', 'scripts', 'research-loop.js');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-workflow-fetchers-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, 'skills', 'wiki-research-loop', 'scripts');
  const home = path.join(root, 'home');
  const wiki = path.join(root, 'wiki');
  const bundled = path.join(scripts, 'source-fetchers');
  const custom = path.join(home, '.pro-workflow', 'fetchers');
  const dist = path.join(root, 'dist', 'db');
  for (const dir of [bundled, custom, dist, wiki]) fs.mkdirSync(dir, { recursive: true });
  const entrypoint = path.join(scripts, 'research-loop.js');
  fs.copyFileSync(scriptPath, entrypoint);
  fs.writeFileSync(path.join(dist, 'store.js'), `
    module.exports.createStore = () => {
      let pending = true;
      return {
        getWiki: () => ({ root_path: ${JSON.stringify(wiki)} }),
        listWikiPages: () => [],
        claimPendingSeed: () => {
          if (!pending) return null;
          pending = false;
          return { id: 1, query: 'local fixture', depth: 0 };
        },
        setSeedStatus() {},
        close() {},
      };
    };
  `);
  for (const [dir, label] of [[bundled, 'bundled'], [custom, 'custom']]) {
    fs.writeFileSync(path.join(dir, 'github.js'), `
      const fs = require('node:fs');
      fs.writeFileSync(${JSON.stringify(path.join(root, `${label}-loaded`))}, 'loaded');
      module.exports = {
        match: () => true,
        fetch: async () => {
          fs.writeFileSync(${JSON.stringify(path.join(root, 'selected-fetcher'))}, ${JSON.stringify(label)});
          return [];
        },
      };
    `);
  }
  return { root, home, entrypoint };
}

function runResearch({ home, entrypoint }, env = {}) {
  const result = spawnSync(process.execPath, [entrypoint, 'run', 'fixture', '--force', '--fetchers', 'github', '--max-pages', '1'], {
    env: { HOME: home, USERPROFILE: home, ...env },
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).halted, 'queue-empty');
}

test('bundled-only research never requires a custom fetcher with the same name', t => {
  const files = fixture(t);
  runResearch(files, { PRO_WORKFLOW_BUNDLED_FETCHERS_ONLY: '1' });
  assert.equal(fs.existsSync(path.join(files.root, 'bundled-loaded')), true);
  assert.equal(fs.existsSync(path.join(files.root, 'custom-loaded')), false);
  assert.equal(fs.readFileSync(path.join(files.root, 'selected-fetcher'), 'utf8'), 'bundled');
});

test('standalone research still loads custom fetchers and allows overriding built-ins', t => {
  const files = fixture(t);
  runResearch(files);
  assert.equal(fs.existsSync(path.join(files.root, 'bundled-loaded')), true);
  assert.equal(fs.existsSync(path.join(files.root, 'custom-loaded')), true);
  assert.equal(fs.readFileSync(path.join(files.root, 'selected-fetcher'), 'utf8'), 'custom');
});
