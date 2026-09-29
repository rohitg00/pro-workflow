#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { runProviderTask } = require('./lib/provider-runner');
const { version } = require('../package.json');

const server = new Server({ name: 'pro-workflow-provider-tools', version }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'run_provider_task',
    description: 'Run a pro-workflow council, survey, embedding, research, or optimizer task using credentials saved in plugin configuration. Tasks may call external providers and write local artifacts. Supply existing CLI arguments without a script name or credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', enum: ['council', 'survey', 'embeddings', 'research', 'optimizer'] },
        args: { type: 'array', items: { type: 'string', maxLength: 32768 }, maxItems: 128 },
        cwd: { type: 'string', description: 'Optional absolute project directory for resolving relative paths.' },
      },
      required: ['task', 'args'],
      additionalProperties: false,
    },
  }],
}));

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  if (request.params.name !== 'run_provider_task') {
    return { content: [{ type: 'text', text: 'Unknown provider tool.' }], isError: true };
  }
  return runProviderTask(request.params.arguments, { signal: extra.signal });
});

server.connect(new StdioServerTransport()).catch(() => {
  process.stderr.write('Unable to start pro-workflow provider tools. Check the plugin installation.\n');
  process.exitCode = 1;
});
