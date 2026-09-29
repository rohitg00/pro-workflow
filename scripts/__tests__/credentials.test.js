const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CREDENTIAL_NAMES, getCredential } = require('../lib/credentials.js');

const names = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'OPENROUTER_API_KEY',
  'FIREWORKS_API_KEY',
  'VOYAGE_API_KEY',
  'LLM_COUNCIL_API_KEY',
  'GITHUB_TOKEN',
  'TYPESAFE_API_KEY',
  'LAYA_API_KEY',
];

test('credential options cover every supported authenticated provider', () => {
  assert.deepEqual(CREDENTIAL_NAMES, names);
});

for (const name of names) {
  test(`${name} requires explicit configuration and prefers the plugin option`, () => {
    const option = `CLAUDE_PLUGIN_OPTION_${name}`;
    const standalone = `PRO_WORKFLOW_${name}`;
    assert.equal(getCredential(name, {}), undefined);
    assert.equal(getCredential(name, { [name]: 'ambient', GH_TOKEN: 'ambient-gh' }), undefined);
    assert.equal(getCredential(name, { [standalone]: ' standalone ' }), 'standalone');
    assert.equal(getCredential(name, { [option]: ' plugin ', [standalone]: 'standalone', [name]: 'ambient' }), 'plugin');
    for (const value of ['', '  ', '${user_config.' + name + '}', ' ${user_config.' + name + '} ']) {
      assert.equal(getCredential(name, { [option]: value, [standalone]: 'standalone', [name]: 'ambient' }), undefined);
      assert.equal(getCredential(name, { [standalone]: value, [name]: 'ambient' }), undefined);
    }
  });
}

test('credential resolver rejects unknown options and non-string values', () => {
  assert.throws(() => getCredential('UNDECLARED_API_KEY', {}), /Unknown credential option/);
  assert.equal(getCredential('OPENAI_API_KEY', { PRO_WORKFLOW_OPENAI_API_KEY: 123 }), undefined);
  assert.equal(getCredential('OPENAI_API_KEY', { CLAUDE_PLUGIN_OPTION_OPENAI_API_KEY: false, PRO_WORKFLOW_OPENAI_API_KEY: 'standalone' }), undefined);
});
