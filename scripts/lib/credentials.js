const CREDENTIAL_NAMES = [
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

function getCredential(name, env = process.env) {
  if (!CREDENTIAL_NAMES.includes(name)) throw new Error('Unknown credential option');
  const value = env[`CLAUDE_PLUGIN_OPTION_${name}`] ?? env[`PRO_WORKFLOW_${name}`];
  if (typeof value !== 'string' || value.trim().startsWith('${user_config.')) return undefined;
  return value.trim() || undefined;
}

module.exports = { CREDENTIAL_NAMES, getCredential };
