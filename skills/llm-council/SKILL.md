---
name: llm-council
description: Provider-agnostic multi-LLM deliberation. Three phases — independent responses, cross-model anonymized ranking, chairman synthesis. Credentials come from explicit plugin configuration or pro-workflow-specific CLI variables. Persists transcript to a wiki page when --wiki <slug> is passed. Use when the user wants multiple AI perspectives, consensus-building, or the "LLM Council" approach for high-stakes reviews, plan critique, or contested learning rules.
user-invocable: true
---

# LLM Council

Karpathy's LLM Council pattern with Anthropic and OpenAI-compatible providers.

## When to use

- High-stakes plan review (`/plan` crosses N-file threshold)
- Conflicting learning-rules → re-resolve via vote
- User invokes `/council "<query>"` or `/wiki council`
- Architecture decisions where you want multiple viewpoints captured
- Persisting deliberation as a wiki page for future reference

## Three phases

1. **Independent**: each model answers in parallel
2. **Ranking**: each model ranks anonymized peer responses
3. **Synthesis**: chairman model reads all responses + rankings → final answer

## Provider config

Configure optional keys in the plugin configuration dialog. Use the `providers` MCP server's `run_provider_task` tool with `task: "council"` and `args: ["run", "<query>", "--provider", "openai"]`. For provider status, pass `args: ["providers"]`. Never request keys in chat or read them from existing credentials or shell configuration.

For standalone CLI use, explicitly set a pro-workflow-specific variable below. The first configured provider is the default; `--provider` selects one explicitly. See [provider configuration](../../references/provider-configuration.md).

| Standalone CLI variable | Provider | Default base URL |
|---------|----------|------------------|
| `PRO_WORKFLOW_ANTHROPIC_API_KEY` | Anthropic | `https://api.anthropic.com` |
| `PRO_WORKFLOW_OPENAI_API_KEY` | OpenAI | `https://api.openai.com/v1` |
| `PRO_WORKFLOW_OPENROUTER_API_KEY` | OpenRouter | `https://openrouter.ai/api/v1` |
| `PRO_WORKFLOW_FIREWORKS_API_KEY` | Fireworks | `https://api.fireworks.ai/inference/v1` |
| `LLM_COUNCIL_BASE_URL` + `PRO_WORKFLOW_LLM_COUNCIL_API_KEY` | Custom OpenAI-compat | (user-supplied) |

Override per-run with `--provider openai|anthropic|openrouter|fireworks|custom`.

Default model rosters per provider live in `scripts/council.js` and can be overridden via `--models` CSV and `--chairman <id>`.

## Commands

In a plugin session, pass these runner arguments through `run_provider_task`. The direct commands below are for standalone CLI installations with explicit credentials.

```
node $SKILL_ROOT/scripts/council.js run "<query>" [--models id1,id2,id3] [--chairman id] [--provider <name>] [--wiki <slug>]
node $SKILL_ROOT/scripts/council.js providers
node $SKILL_ROOT/scripts/council.js show <session-id>
```

`--wiki <slug>` writes the full transcript to `<wiki>/derived/council/<session-id>.md` and registers it via `wiki-cli.js page` so it shows in FTS5 search.

## Output

Each session writes:

```
~/.pro-workflow/council/<session-id>/
├── config.json           # query, models, chairman, provider
├── phase1_responses.json # raw API responses per model
├── phase2_rankings.json  # anonymized ranking outputs
├── phase3_synthesis.txt  # chairman's final answer
└── final_output.md       # human-readable bundle
```

Console prints the markdown bundle. Pipe to `pbcopy` / `tee` as needed.

## Hard rules

1. Never skip the ranking phase. It's the core of the council pattern.
2. Save raw responses to disk verbatim. No summarization in storage.
3. Anonymize responses for ranking — models see `Response A/B/C/...`, not peer names.
4. The chairman sees both real names AND rankings.
5. Display all three phases to the user. No phase elision.

## Cost awareness

The script logs per-call latency + tokens on supported providers. Multiply by your provider rate to estimate. Council cost grows linearly with `len(models)^2` (each model ranks all others) plus the chairman.

Default council size: 3-5 models. More models = exponentially more ranking calls.

## Use with wiki

```
/wiki council agent-memory "should we adopt episodic memory in our agents?"
```

Loads `agent-memory` wiki context as system prompt prefix, runs council, persists transcript as `wiki/derived/council/<id>.md`. The transcript becomes searchable via `/wiki ask`.
