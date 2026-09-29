const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

const fetcherPath = path.join(__dirname, '..', '..', 'skills', 'wiki-research-loop', 'scripts', 'source-fetchers', 'github.js');
const source = fs.readFileSync(fetcherPath, 'utf8');
const repository = { full_name: 'example/project', html_url: 'https://github.com/example/project', description: 'Useful project', stargazers_count: 3, language: 'JavaScript' };

function mockFetcher(replies, env = { PRO_WORKFLOW_GITHUB_TOKEN: 'test-token' }) {
  const requests = [];
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    URL,
    process: { env },
    require(name) {
      if (name === '../../../../scripts/lib/credentials.js') {
        return { getCredential: key => env[`PRO_WORKFLOW_${key}`] };
      }
      assert.equal(name, 'https');
      return {
        get(url, options, callback) {
          const record = { url: String(url), headers: { ...options.headers } };
          requests.push(record);
          const req = new EventEmitter();
          req.destroy = error => { record.destroyed = true; req.emit('error', error); };
          req.setTimeout = (timeout, onTimeout) => { record.timeout = timeout; req.onTimeout = onTimeout; };
          process.nextTick(() => {
            const reply = replies[requests.length - 1];
            assert.ok(reply, 'unexpected additional network request');
            if (reply.timeout) return req.onTimeout();
            const res = new EventEmitter();
            res.statusCode = reply.status ?? 200;
            res.headers = reply.location ? { location: reply.location } : {};
            res.resume = () => { record.drained = true; };
            callback(res);
            if (!record.drained) {
              res.emit('data', JSON.stringify(reply.body ?? { items: [repository] }));
              res.emit('end');
            }
          });
          return req;
        },
      };
    },
  }, { filename: fetcherPath });
  return { fetcher: module.exports, requests };
}

test('GitHub follows relative and absolute same-origin redirects with authentication', async () => {
  const { fetcher, requests } = mockFetcher([
    { status: 301, location: '/renamed/search?q=workflow' },
    { status: 302, location: 'https://api.github.com/final/search?q=workflow' },
    {},
  ]);
  const result = await fetcher.fetch('workflow');
  assert.equal(result[0].title, repository.full_name);
  assert.equal(requests.length, 3);
  assert.equal(requests[1].url, 'https://api.github.com/renamed/search?q=workflow');
  assert.equal(requests[2].url, 'https://api.github.com/final/search?q=workflow');
  for (const request of requests) {
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.equal(request.timeout, 15000);
  }
  assert.equal(requests[0].drained, true);
  assert.equal(requests[1].drained, true);
});

test('GitHub does not consume ambient GitHub credentials', async () => {
  const { fetcher, requests } = mockFetcher([{}], { GH_TOKEN: 'ambient-gh-token', GITHUB_TOKEN: 'ambient-github-token' });
  const result = await fetcher.fetch('workflow');
  assert.equal(result[0].title, repository.full_name);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.Authorization, undefined);
});

for (const location of ['https://outside.example/steal', '//outside.example/steal', 'http://api.github.com/search', 'https://api.github.com:444/search']) {
  test(`GitHub rejects cross-origin redirect to ${location}`, async () => {
    const { fetcher, requests } = mockFetcher([{ status: 302, location }]);
    const result = await fetcher.fetch('workflow');
    assert.equal(result.length, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].drained, true);
  });
}

test('GitHub bounds same-origin redirect loops to five hops', async () => {
  const { fetcher, requests } = mockFetcher(Array.from({ length: 6 }, () => ({ status: 302, location: '/loop' })));
  const result = await fetcher.fetch('workflow');
  assert.equal(result.length, 0);
  assert.equal(requests.length, 6);
});

test('GitHub destroys timed-out requests and returns no results', async () => {
  const { fetcher, requests } = mockFetcher([{ timeout: true }]);
  const result = await fetcher.fetch('workflow');
  assert.equal(result.length, 0);
  assert.equal(requests[0].timeout, 15000);
  assert.equal(requests[0].destroyed, true);
});

test('GitHub safely rejects malformed redirect locations', async () => {
  const { fetcher, requests } = mockFetcher([{ status: 302, location: 'https://[' }]);
  const result = await fetcher.fetch('workflow');
  assert.equal(result.length, 0);
  assert.equal(requests.length, 1);
});
