/**
 * Server-side environment inspection. Imported by server components and route
 * handlers only. Nothing here is sent to the browser.
 */

function clean(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function getAppUrl() {
  const raw = clean(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000";
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function getSupabaseConfig() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let validUrl = false;
  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    validUrl = false;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    configured: Boolean(validUrl && anonKey),
    adminConfigured: Boolean(validUrl && serviceRoleKey),
    validUrl,
  };
}

export function getAiConfig() {
  const provider = clean(process.env.AI_PROVIDER) || "groq";
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000);

  if (provider === "groq") {
    const apiKey = clean(process.env.GROQ_API_KEY);
    const model = clean(process.env.GROQ_MODEL);
    return {
      provider,
      providerLabel: "Groq",
      apiKey,
      model,
      baseUrl:
        clean(process.env.GROQ_BASE_URL) || "https://api.groq.com/openai/v1",
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 45000,
      configured: Boolean(apiKey && model),
      supportsJsonMode: true,
      missing: [
        !apiKey ? "GROQ_API_KEY" : null,
        !model ? "GROQ_MODEL" : null,
      ].filter(Boolean),
    };
  }

  if (provider === "google" || provider === "gemini") {
    const apiKey = clean(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
    const model = clean(process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL) || "gemini-1.5-flash";
    return {
      provider,
      providerLabel: "Google AI Studio (Gemini)",
      apiKey,
      model,
      baseUrl:
        clean(process.env.GOOGLE_AI_BASE_URL) ||
        "https://generativelanguage.googleapis.com/v1beta/openai",
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 45000,
      configured: Boolean(apiKey && model),
      supportsJsonMode: true,
      missing: [!apiKey ? "GOOGLE_AI_API_KEY" : null].filter(Boolean),
    };
  }

  if (provider === "openai-compatible") {
    const apiKey = clean(process.env.AI_API_KEY);
    const model = clean(process.env.AI_MODEL);
    const baseUrl = clean(process.env.AI_BASE_URL);
    return {
      provider,
      providerLabel: "OpenAI-compatible provider",
      apiKey,
      model,
      baseUrl,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 45000,
      configured: Boolean(apiKey && model && baseUrl),
      supportsJsonMode: clean(process.env.AI_SUPPORTS_JSON_MODE) !== "false",
      missing: [
        !apiKey ? "AI_API_KEY" : null,
        !model ? "AI_MODEL" : null,
        !baseUrl ? "AI_BASE_URL" : null,
      ].filter(Boolean),
    };
  }

  return {
    provider,
    providerLabel: provider,
    apiKey: "",
    model: "",
    baseUrl: "",
    timeoutMs: 45000,
    configured: false,
    supportsJsonMode: false,
    missing: ["AI_PROVIDER (unsupported value)"],
  };
}

export function getExecutionConfig() {
  const provider = clean(process.env.CODE_EXECUTION_PROVIDER) || "judge0";
  const apiUrl = clean(process.env.CODE_EXECUTION_API_URL);
  const apiKey = clean(process.env.CODE_EXECUTION_API_KEY);
  const authHeader =
    clean(process.env.CODE_EXECUTION_AUTH_HEADER) || "X-Auth-Token";
  const languageId = clean(process.env.CODE_EXECUTION_PYTHON_LANGUAGE_ID) || "71";
  const timeoutMs = Number(process.env.CODE_EXECUTION_TIMEOUT_MS || 20000);

  let validUrl = false;
  let localhost = false;
  try {
    const parsed = new URL(apiUrl);
    validUrl = parsed.protocol === "https:" || parsed.protocol === "http:";
    localhost = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    validUrl = false;
  }

  const supported = provider === "judge0";

  return {
    provider,
    apiUrl,
    apiKey,
    authHeader,
    languageId,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 20000,
    validUrl,
    localhost,
    supported,
    configured: Boolean(supported && validUrl),
    missing: [
      !supported ? "CODE_EXECUTION_PROVIDER (supported: judge0)" : null,
      !apiUrl ? "CODE_EXECUTION_API_URL" : null,
      apiUrl && !validUrl ? "CODE_EXECUTION_API_URL (invalid URL)" : null,
    ].filter(Boolean),
  };
}

export function getIntegrationStatus() {
  const supabase = getSupabaseConfig();
  const ai = getAiConfig();
  const execution = getExecutionConfig();

  return {
    supabase: {
      configured: supabase.configured,
      adminConfigured: supabase.adminConfigured,
      missing: [
        !supabase.configured ? "NEXT_PUBLIC_SUPABASE_URL" : null,
        !supabase.configured ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
        !supabase.adminConfigured ? "SUPABASE_SERVICE_ROLE_KEY" : null,
      ].filter(Boolean),
    },
    ai: {
      configured: ai.configured,
      provider: ai.provider,
      missing: ai.missing,
    },
    execution: {
      configured: execution.configured,
      provider: execution.provider,
      missing: execution.missing,
      languageId: execution.languageId,
    },
    googleAuth:
      clean(process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH).toLowerCase() === "true",
    appUrl: getAppUrl(),
  };
}
