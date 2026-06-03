import * as https from 'node:https';

const DEFAULT_TIMEOUT_MS = 120_000;

export type Provider = 'anthropic' | 'openai' | 'openrouter' | 'fireworks';

export interface LLMRequest {
  provider: Provider;
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const PROVIDER_CFG: Record<Provider, { host: string; path: string; envKey: string }> = {
  anthropic: { host: 'api.anthropic.com', path: '/v1/messages', envKey: 'ANTHROPIC_API_KEY' },
  openai: { host: 'api.openai.com', path: '/v1/chat/completions', envKey: 'OPENAI_API_KEY' },
  openrouter: { host: 'openrouter.ai', path: '/api/v1/chat/completions', envKey: 'OPENROUTER_API_KEY' },
  fireworks: { host: 'api.fireworks.ai', path: '/inference/v1/chat/completions', envKey: 'FIREWORKS_API_KEY' },
};

const PRICE_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const cfg = PROVIDER_CFG[req.provider];
  const apiKey = process.env[cfg.envKey];
  if (!apiKey) throw new Error(`${cfg.envKey} not set in environment`);

  const body = req.provider === 'anthropic'
    ? buildAnthropicBody(req)
    : buildOpenAIBody(req);

  const headers: Record<string, string> = req.provider === 'anthropic'
    ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
    : { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };

  const price = PRICE_PER_M_TOKENS[req.model];
  if (!price) {
    const known = Object.keys(PRICE_PER_M_TOKENS).join(', ');
    throw new Error(
      `Unknown model "${req.model}". Budget cap cannot be enforced. ` +
      `Add a price entry to PRICE_PER_M_TOKENS in src/optimizer/llm.ts or pick one of: ${known}.`,
    );
  }

  const raw = await postJson(cfg.host, cfg.path, headers, body);
  const parsed = JSON.parse(raw);
  const text = extractText(req.provider, parsed);
  const usage = extractUsage(req.provider, parsed);
  const costUsd = (usage.input / 1_000_000) * price.input + (usage.output / 1_000_000) * price.output;

  return { text, inputTokens: usage.input, outputTokens: usage.output, costUsd };
}

function buildAnthropicBody(req: LLMRequest): string {
  return JSON.stringify({
    model: req.model,
    max_tokens: req.maxTokens ?? 4096,
    temperature: req.temperature ?? 0.2,
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
  });
}

function buildOpenAIBody(req: LLMRequest): string {
  return JSON.stringify({
    model: req.model,
    max_tokens: req.maxTokens ?? 4096,
    temperature: req.temperature ?? 0.2,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
  });
}

function extractText(provider: Provider, body: unknown): string {
  const obj = body as Record<string, unknown>;
  if (provider === 'anthropic') {
    const content = obj.content as Array<{ type: string; text?: string }> | undefined;
    return content?.find((c) => c.type === 'text')?.text ?? '';
  }
  const choices = obj.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? '';
}

function extractUsage(provider: Provider, body: unknown): { input: number; output: number } {
  const obj = body as Record<string, unknown>;
  if (provider === 'anthropic') {
    const u = obj.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    return { input: u?.input_tokens ?? 0, output: u?.output_tokens ?? 0 };
  }
  const u = obj.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  return { input: u?.prompt_tokens ?? 0, output: u?.completion_tokens ?? 0 };
}

function postJson(host: string, path: string, headers: Record<string, string>, body: string): Promise<string> {
  const timeoutMs = parseInt(process.env.SKILL_OPTIMIZER_TIMEOUT_MS ?? '', 10) || DEFAULT_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      fn();
    };
    const req = https.request(
      { host, path, method: 'POST', headers: { ...headers, 'content-length': Buffer.byteLength(body).toString() } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if ((res.statusCode ?? 500) >= 400) {
            settle(() => reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 500)}`)));
          } else {
            settle(() => resolve(text));
          }
        });
        res.on('error', (err) => settle(() => reject(err)));
      },
    );
    req.on('error', (err) => settle(() => reject(err)));
    timer = setTimeout(() => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    req.write(body);
    req.end();
  });
}
