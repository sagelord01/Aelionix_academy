export class ApiRequestError extends Error {
  constructor(message, { code = "request_failed", status = 0, payload = null } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}

export async function postJson(url, body, { signal } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiRequestError(
      "Network request failed. Check your connection and try again.",
      { code: "network_error" },
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.ok) {
    throw new ApiRequestError(
      payload?.error?.message || "The request could not be completed.",
      {
        code: payload?.error?.code || "request_failed",
        status: response.status,
        payload,
      },
    );
  }

  return payload;
}

export async function getJson(url, { signal } = {}) {
  let response;
  try {
    response = await fetch(url, { signal, cache: "no-store" });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiRequestError(
      "Network request failed. Check your connection and try again.",
      { code: "network_error" },
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new ApiRequestError(
      payload?.error?.message || "The request could not be completed.",
      {
        code: payload?.error?.code || "request_failed",
        status: response.status,
        payload,
      },
    );
  }
  return payload;
}
