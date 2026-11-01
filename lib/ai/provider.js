import "server-only";
import { getAiConfig } from "@/lib/config/env";
import { parseTutorResponse } from "@/lib/ai/response";

export class AiError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = "AiError";
    this.code = code;
    this.status = status;
  }
}

function endpoint(config) {
  return `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

async function requestCompletion({ config, messages, jsonMode }) {
  let response;

  try {
    response = await fetch(endpoint(config), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.35,
        max_tokens: 450,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new AiError(
        "ai_timeout",
        "The tutor took too long to respond. Your work and messages are still here. Try again.",
        504,
      );
    }
    throw new AiError(
      "ai_network_error",
      "The tutor service could not be reached. Your work is still here. Try again.",
      503,
    );
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (response.status === 429) {
    throw new AiError(
      "ai_rate_limited",
      "The tutor provider is rate limiting requests. Wait a moment and try again.",
      429,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiError(
      "ai_auth_failed",
      "The tutor provider rejected the configured API key.",
      503,
    );
  }

  if (!response.ok) {
    const providerMessage = payload?.error?.message || "";
    const unsupportedJsonMode =
      response.status === 400 && providerMessage.toLowerCase().includes("response_format");
    if (unsupportedJsonMode && jsonMode) {
      return requestCompletion({ config, messages, jsonMode: false });
    }
    throw new AiError(
      "ai_provider_error",
      response.status >= 500
        ? "The tutor provider is temporarily unavailable. Try again shortly."
        : "The tutor provider could not process that request.",
      response.status >= 500 ? 503 : 502,
    );
  }

  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new AiError(
      "ai_empty_response",
      "The tutor returned an empty response. Try sending your message again.",
      502,
    );
  }

  const parsed = parseTutorResponse(raw);

  return {
    response: parsed.response,
    parseStatus: parsed.ok ? "structured" : "fallback_text",
    raw,
    usage: {
      inputTokens: Number(payload?.usage?.prompt_tokens) || null,
      outputTokens: Number(payload?.usage?.completion_tokens) || null,
    },
    model: payload?.model || config.model,
    provider: config.provider,
  };
}

export async function requestTutor({ systemPrompt, messages }) {
  const config = getAiConfig();

  if (!config.configured) {
    throw new AiError(
      "ai_not_configured",
      `The tutor is not configured. Add ${config.missing.join(", ")} to .env.local.`,
      503,
    );
  }

  return requestCompletion({
    config,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    jsonMode: config.supportsJsonMode,
  });
}

export function tutorAvailability() {
  const config = getAiConfig();
  return {
    configured: config.configured,
    provider: config.provider,
    providerLabel: config.providerLabel,
    missing: config.missing,
    model: config.model,
  };
}
