// llm.js — model access for the pipeline's LLM loop.
//
// ONE backend, no exceptions: Brama, the org model router
// (OpenAI-compatible /v1/chat/completions). Credentials come from the
// pipeline config via skarbiec:// refs like everything else — never
// from env. There is intentionally NO direct provider API code in this
// package (no Anthropic/OpenAI/etc. endpoints): the user has explicitly
// rejected direct provider calls for this pipeline.
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

/** Build the model transport from a resolved pipeline config. */
export function buildCompleter(models = {}, { fetchImpl } = {}) {
  const fetch_ = fetchImpl ?? fetch;
  if (models.anthropic || models.openai || models.direct) {
    throw new LlmError(
      'direct provider APIs are not supported in this package — model access goes ' +
        'only through Brama (models.brama.url + models.brama.key)',
    );
  }
  if (models.brama?.url && models.brama?.key) {
    return bramaCompleter(models.brama, fetch_);
  }
  throw new LlmError(
    'no model backend configured — set models.brama.url+key ' +
      '(skarbiec:// references in pipeline.config.json)',
  );
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
