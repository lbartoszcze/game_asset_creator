// llm.js — model access for the pipeline's LLM loop.
//
// Two backends, both fed from the pipeline config (secrets resolved from
// skarbiec:// refs like everything else — never from env):
//
//   models.anthropic: { api_key: "skarbiec://ANTHROPIC/api_key",
//                       model: "claude-opus-4-6", base_url? }
//   models.brama:     { url, key: "skarbiec://BRAMA/agent_auth_secret",
//                       model }                     — OpenAI-compatible router
//
// The transport is one function: complete({ system, messages, maxTokens })
// → text. Injected as a seam in tests.

export class LlmError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
    this.cause = cause;
  }
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-6';
const DEFAULT_ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** Build the model transport from a resolved pipeline config. */
export function buildCompleter(models = {}, { fetchImpl } = {}) {
  const fetch_ = fetchImpl ?? fetch;
  if (models.anthropic?.api_key) {
    return anthropicCompleter(models.anthropic, fetch_);
  }
  if (models.brama?.url && models.brama?.key) {
    return bramaCompleter(models.brama, fetch_);
  }
  throw new LlmError(
    'no model backend configured — set models.anthropic.api_key or models.brama.url+key ' +
      '(skarbiec:// references in pipeline.config.json)',
  );
}

function anthropicCompleter(cfg, fetch_) {
  const model = cfg.model ?? DEFAULT_ANTHROPIC_MODEL;
  const url = cfg.base_url ?? DEFAULT_ANTHROPIC_URL;
  return async function complete({ system, messages, maxTokens = 4096 }) {
    const response = await fetch_(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new LlmError(`anthropic API HTTP ${response.status}: ${body?.error?.message ?? 'unknown'}`, {
        status: response.status,
      });
    }
    const text = (body.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return { text, stopReason: body.stop_reason };
  };
}

/** OpenAI-compatible chat-completions shape (what model routers like Brama speak). */
function bramaCompleter(cfg, fetch_) {
  const url = `${cfg.url.replace(/\/+$/, '')}/v1/chat/completions`;
  return async function complete({ system, messages, maxTokens = 4096 }) {
    const response = await fetch_(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model ?? 'any',
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, ...openAiMessages(messages)],
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new LlmError(`brama HTTP ${response.status}: ${body?.error?.message ?? 'unknown'}`, {
        status: response.status,
      });
    }
    const text = body.choices?.[0]?.message?.content ?? '';
    return { text, stopReason: body.choices?.[0]?.finish_reason };
  };
}

/** Anthropic content-block messages → plain OpenAI messages (images dropped with a note). */
function openAiMessages(messages) {
  return messages.map((message) => {
    if (typeof message.content === 'string') return message;
    const parts = (message.content ?? []).map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'image') return '[viewport screenshot attached]';
      return '';
    });
    return { role: message.role, content: parts.join('\n') };
  });
}

/** Pull the first JSON object out of a model reply (fences / prose tolerated). */
export function parseJsonFrom(text) {
  const fence = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/.exec(text);
  const candidate = fence ? fence[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!candidate) throw new LlmError(`model reply contained no JSON object: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(candidate);
  } catch (error) {
    throw new LlmError(`model reply JSON does not parse: ${error.message}`, { cause: error });
  }
}
