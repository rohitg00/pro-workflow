const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.join(__dirname, '..', 'embed-wiki.js');
const source = fs.readFileSync(scriptPath, 'utf8');

async function search(args, { store, helpers }) {
  const output = [];
  const errors = [];
  const embeddingLoads = [];
  await vm.runInNewContext(source, {
    __dirname: path.dirname(scriptPath),
    require(name) {
      if (name === 'fs') return { existsSync: () => true };
      if (name === 'path') return path;
      if (name.endsWith('/dist/db/store.js')) return { createStore: () => store };
      if (name.endsWith('/dist/search/embeddings.js')) {
        embeddingLoads.push(name);
        assert.ok(helpers, 'embedding helpers must not be loaded');
        return helpers;
      }
      throw new Error(`Unexpected module: ${name}`);
    },
    process: {
      argv: [process.execPath, scriptPath, 'search', ...args],
      env: {},
      exit(code) { throw new Error(`Unexpected exit: ${code}`); },
    },
    console: {
      log(value) { output.push(value); },
      error(value) { errors.push(value); },
    },
  }, { filename: scriptPath });
  assert.deepEqual(errors, []);
  return { result: JSON.parse(output[0]), embeddingLoads };
}

test('BM25 search works without credentials or loading embedding helpers', async () => {
  const calls = [];
  let closed = false;
  const hits = [{ page_id: 7, title: 'Local search', snippet: 'matches query', rank: -2 }];
  const { result, embeddingLoads } = await search(['private query', '--mode', 'bm25', '--wiki', 'local', '--limit', '4'], {
    store: {
      searchWiki(query, options) { calls.push({ query, options: { ...options } }); return hits; },
      close() { closed = true; },
    },
  });
  assert.deepEqual(result, hits);
  assert.deepEqual(calls, [{ query: 'private query', options: { wikiSlug: 'local', limit: 4, loose: true } }]);
  assert.deepEqual(embeddingLoads, []);
  assert.equal(closed, true);
});

test('vector search embeds the query and returns vector results', async () => {
  let closed = false;
  let embedded;
  let vectorOptions;
  const hits = [{ page_id: 8, similarity: 0.9 }];
  const { result } = await search(['query', '--mode', 'vector', '--wiki', 'notes', '--limit', '2'], {
    store: {
      db: {},
      searchWiki() { assert.fail('vector search does not need keyword search'); },
      close() { closed = true; },
    },
    helpers: {
      getEmbeddingProvider() { return { async embed(inputs) { embedded = [...inputs]; return [[0.1, 0.2]]; } }; },
      vectorSearch(db, vector, options) {
        assert.deepEqual(vector, [0.1, 0.2]);
        vectorOptions = { ...options };
        return hits;
      },
    },
  });
  assert.deepEqual(result, hits);
  assert.deepEqual(embedded, ['query']);
  assert.deepEqual(vectorOptions, { wikiSlug: 'notes', limit: 2 });
  assert.equal(closed, true);
});

test('hybrid search still fuses keyword and vector results', async () => {
  let closed = false;
  let fusedLists;
  const keywordHit = { page_id: 7, title: 'Keyword match', rank: -3 };
  const vectorRow = { page_id: 8, title: 'Semantic match' };
  const { result } = await search(['query', '--limit', '2'], {
    store: {
      db: { prepare() { return { get(id) { assert.equal(id, 8); return vectorRow; } }; } },
      searchWiki() { return [keywordHit]; },
      close() { closed = true; },
    },
    helpers: {
      getEmbeddingProvider() { return { async embed() { return [[0.1]]; } }; },
      vectorSearch() { return [{ page_id: 8, similarity: 0.9 }]; },
      reciprocalRankFusion(lists, key) {
        fusedLists = JSON.parse(JSON.stringify(lists));
        assert.equal(key({ page_id: 7 }), '7');
        return [{ key: '7', score: 0.5 }, { key: '8', score: 0.4 }];
      },
    },
  });
  assert.deepEqual(fusedLists, [[{ page_id: 8 }], [{ page_id: 7 }]]);
  assert.deepEqual(result, [
    { ...keywordHit, rrf_score: 0.5 },
    { ...vectorRow, rank: -0.9, snippet: '', rrf_score: 0.4 },
  ]);
  assert.equal(closed, true);
});
