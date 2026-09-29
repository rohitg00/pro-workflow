# Provider configuration

API-backed features use credentials explicitly supplied for pro-workflow. Local keyword search, learnings, and deterministic guards work without any API key.

## Claude Code plugin

Enter optional keys in the plugin configuration dialog. The manifest declares each key with `userConfig` and `sensitive: true`; Claude Code stores these values in its secure credential store. Leave unused providers blank. Reconnect the plugin's `providers` MCP server after changing configuration.

The MCP server receives configured values through `${user_config.KEY}` substitutions in its process environment. It runs a fixed set of bundled scripts through the `run_provider_task` tool. Credentials are never tool arguments. Classifier hooks receive their configured keys through `CLAUDE_PLUGIN_OPTION_TYPESAFE_API_KEY` and `CLAUDE_PLUGIN_OPTION_LAYA_API_KEY`; classification still requires a separate explicit enable setting.

Use the MCP tool for API-backed operations in plugin sessions. Claude Code does not export plugin options to ordinary Bash commands, and sensitive options must not be substituted into skill text. Never ask for keys in chat, inspect shell profiles or credential stores, or put keys in command arguments.

| Task | Example `args` |
| --- | --- |
| `council` | `["providers"]` or `["run", "Compare these designs", "--provider", "openai"]` |
| `survey` | `["--bundle", "/absolute/path/research_bundle.json", "--wiki", "agent-memory"]` |
| `embeddings` | `["all", "agent-memory"]` or `["search", "consolidation", "--mode", "hybrid"]` |
| `research` | `["run", "agent-memory", "--fetchers", "github", "--max-pages", "5"]` |
| `optimizer` | `["--slug", "wrap-up", "--budget-usd", "0.50"]` |

Pass an absolute project path as `cwd` when arguments contain relative paths. The tool can write the normal runner artifacts and make provider requests; it uses the host's normal tool approval flow. Each run is bounded to ten minutes and 1 MiB of output. Budget and kill-switch controls inside the existing runners still apply. MCP research uses only bundled source fetchers; user-supplied fetcher modules remain available through the standalone CLI and do not receive plugin credentials automatically.

The server needs the plugin's installed dependencies. Wiki, embedding, survey, and optimizer operations also need the TypeScript build. If the host skipped installation or build, run `npm ci` and `npm run build` in the installed plugin directory, then reconnect the MCP server.

## Standalone CLI and other agents

Run standalone scripts from a complete pro-workflow checkout or npm package, including `scripts/lib`. A skills-only copy supplies instructions but not the shared credential helper or SQLite runtime. Install dependencies and build in that complete directory.

Supply only the credentials needed for the requested task using your host's secret configuration and the following variable names. Do not put values in source files or committed JSON. Pro-workflow does not read existing credential files, shell profiles, or generic provider environment keys.

| Provider | Explicit CLI variable |
| --- | --- |
| Anthropic | `PRO_WORKFLOW_ANTHROPIC_API_KEY` |
| OpenAI | `PRO_WORKFLOW_OPENAI_API_KEY` |
| OpenRouter | `PRO_WORKFLOW_OPENROUTER_API_KEY` |
| Fireworks | `PRO_WORKFLOW_FIREWORKS_API_KEY` |
| Voyage | `PRO_WORKFLOW_VOYAGE_API_KEY` |
| Custom OpenAI-compatible endpoint | `PRO_WORKFLOW_LLM_COUNCIL_API_KEY` plus `LLM_COUNCIL_BASE_URL` |
| GitHub research | `PRO_WORKFLOW_GITHUB_TOKEN` |
| Jev classifier | `PRO_WORKFLOW_TYPESAFE_API_KEY` |
| Laya classifier | `PRO_WORKFLOW_LAYA_API_KEY` |

Migration: keys previously supplied through `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GH_TOKEN`, or similar generic names must now be configured specifically for pro-workflow. There is no automatic fallback to those values. Explicit hook options take precedence over standalone variables, including when an option is empty.

If no provider is configured, council, surveys, embedding retrieval, and optimization report missing configuration. GitHub research continues unauthenticated. `embed-wiki.js search <query> --mode bm25` stays local even when an embedding key is configured.

## Review notes

The curl/wget strings in safe-mode documentation, deny rules, and tests are examples of commands the guard blocks. They are not download-and-run installation steps. Tests and protective rules remain in the repository. Dependency installation from the committed lockfile is retained; native SQLite still requires its runtime dependency.

See the [Claude Code manifest reference](https://code.claude.com/docs/en/plugins-reference#user-configuration) for configuration storage and supported substitution locations.
