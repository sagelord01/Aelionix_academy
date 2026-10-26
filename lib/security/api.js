import "server-only";

export function apiError(code, message, status = 400, extra = {}) {
  return Response.json(
    {
      ok: false,
      error: { code, message, ...extra },
    },
    { status },
  );
}

export function apiSuccess(data = {}, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}

export async function readJson(request, maxBytes = 100_000) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    return { error: apiError("payload_too_large", "Request is too large.", 413) };
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    return { error: apiError("payload_too_large", "Request is too large.", 413) };
  }

  try {
    return { data: text ? JSON.parse(text) : {} };
  } catch {
    return { error: apiError("invalid_json", "Request body must be valid JSON.", 400) };
  }
}

export function logServerError(context, error) {
  // Log only the operational message, never request bodies, tokens, or code.
  console.error(`[${context}]`, error?.code || error?.name || "error", error?.message || "");
}

export function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}
