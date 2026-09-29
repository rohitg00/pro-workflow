import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import type { ClientRequest, IncomingMessage, OutgoingHttpHeaders } from 'node:http';
import { CREDENTIAL_NAMES } from '../../../scripts/lib/credentials.js';
import { getEmbeddingProvider } from '../../search/embeddings';
import { callLLM, type Provider } from '../llm';

function configureEnv(t: TestContext, values: Record<string, string>) {
  const keys = [...CREDENTIAL_NAMES.flatMap(name => [name, `PRO_WORKFLOW_${name}`, `CLAUDE_PLUGIN_OPTION_${name}`]), 'GH_TOKEN', 'PROWORKFLOW_EMBED_MODEL'];
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function mockTransport(t: TestContext, payload: unknown) {
  const requests: { options: https.RequestOptions; body: string }[] = [];
  const request = (options: https.RequestOptions, callback: (response: IncomingMessage) => void) => {
    const record = { options, body: '' };
    requests.push(record);
    const req = Object.assign(new EventEmitter(), {
      write(body: string) { record.body += body; },
      setTimeout() { return req; },
      destroy(error: Error) { req.emit('error', error); return req; },
      end() {
        queueMicrotask(() => {
          const res = Object.assign(new EventEmitter(), { statusCode: 200 });
          callback(res as IncomingMessage);
          res.emit('data', Buffer.from(JSON.stringify(payload)));
          res.emit('end');
        });
        return req;
      },
    });
    return req as unknown as ClientRequest;
  };
  t.mock.method(https, 'request', request as typeof https.request);
  return requests;
}

test('embedding selection ignores ambient provider credentials', t => {
  configureEnv(t, { OPENAI_API_KEY: 'ambient-openai', VOYAGE_API_KEY: 'ambient-voyage' });
  const requests = mockTransport(t, {});
  assert.equal(getEmbeddingProvider(), null);
  assert.equal(requests.length, 0);
});

for (const prefix of ['CLAUDE_PLUGIN_OPTION_', 'PRO_WORKFLOW_']) {
  for (const [name, key, host] of [
    ['openai', 'OPENAI_API_KEY', 'api.openai.com'],
    ['voyage', 'VOYAGE_API_KEY', 'api.voyageai.com'],
  ]) {
    test(`${name} embeddings use ${prefix} credentials on the request`, async t => {
      configureEnv(t, { [prefix + key]: 'configured-key', OPENAI_API_KEY: 'ambient-openai', VOYAGE_API_KEY: 'ambient-voyage' });
      const requests = mockTransport(t, { data: [{ embedding: [0.25, 0.5] }] });
      const provider = getEmbeddingProvider();
      assert.ok(provider);
      assert.equal(provider.name, name);
      const vectors = await provider.embed(['private query']);
      assert.deepEqual(Array.from(vectors[0]), [0.25, 0.5]);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].options.hostname, host);
      assert.equal((requests[0].options.headers as OutgoingHttpHeaders).Authorization, 'Bearer configured-key');
      assert.deepEqual(JSON.parse(requests[0].body).input, ['private query']);
    });
  }
}

const providers: { provider: Provider; key: string; host: string; model: string }[] = [
  { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', host: 'api.anthropic.com', model: 'claude-haiku-4-5' },
  { provider: 'openai', key: 'OPENAI_API_KEY', host: 'api.openai.com', model: 'gpt-4o-mini' },
  { provider: 'openrouter', key: 'OPENROUTER_API_KEY', host: 'openrouter.ai', model: 'gpt-4o-mini' },
  { provider: 'fireworks', key: 'FIREWORKS_API_KEY', host: 'api.fireworks.ai', model: 'gpt-4o-mini' },
];

for (const { provider, key, host, model } of providers) {
  test(`${provider} optimizer rejects an ambient credential before requesting`, async t => {
    configureEnv(t, { [key]: 'ambient-key' });
    const requests = mockTransport(t, {});
    await assert.rejects(callLLM({ provider, model, system: 'system', user: 'private input' }), new RegExp(`PRO_WORKFLOW_${key}`));
    assert.equal(requests.length, 0);
  });

  for (const prefix of ['CLAUDE_PLUGIN_OPTION_', 'PRO_WORKFLOW_']) {
    test(`${provider} optimizer uses ${prefix} credentials on the request`, async t => {
      configureEnv(t, { [prefix + key]: 'configured-key', [key]: 'ambient-key' });
      const payload = provider === 'anthropic'
        ? { content: [{ type: 'text', text: 'result' }], usage: { input_tokens: 12, output_tokens: 3 } }
        : { choices: [{ message: { content: 'result' } }], usage: { prompt_tokens: 12, completion_tokens: 3 } };
      const requests = mockTransport(t, payload);
      const result = await callLLM({ provider, model, system: 'system', user: 'private input' });
      assert.equal(result.text, 'result');
      assert.equal(result.inputTokens, 12);
      assert.equal(result.outputTokens, 3);
      assert.ok(result.costUsd > 0);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].options.host, host);
      const authHeader = provider === 'anthropic' ? 'x-api-key' : 'authorization';
      const authValue = provider === 'anthropic' ? 'configured-key' : 'Bearer configured-key';
      assert.equal((requests[0].options.headers as OutgoingHttpHeaders)[authHeader], authValue);
      assert.equal(JSON.parse(requests[0].body).messages.at(-1).content, 'private input');
    });
  }
}
