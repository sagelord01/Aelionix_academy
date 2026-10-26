import "server-only";
import { getExecutionConfig } from "@/lib/config/env";
import { normalizeJudge0Result } from "@/lib/execution/normalize";
import {
  allTestsPassed,
  buildTestHarness,
  parseTestResults,
} from "@/lib/execution/harness";

export class ExecutionError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = "ExecutionError";
    this.code = code;
    this.status = status;
  }
}

function baseUrl() {
  const config = getExecutionConfig();
  return {
    ...config,
    base: config.apiUrl.replace(/\/+$/, ""),
  };
}

function headersFor(config) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (config.apiKey) {
    headers[config.authHeader] = config.apiKey;
    if (config.authHeader.toLowerCase().includes("rapidapi")) {
      try {
        headers["X-RapidAPI-Host"] = new URL(config.apiUrl).host;
      } catch {
        // The configuration validator handles invalid URLs.
      }
    }
  }
  return headers;
}

async function requestJson(url, options, timeoutMs) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...headersFor(baseUrl()), ...(options.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new ExecutionError(
        "execution_timeout",
        "The execution service did not respond in time. Your code was preserved.",
        504,
      );
    }
    throw new ExecutionError(
      "execution_unavailable",
      "The execution service could not be reached. Your code was preserved.",
      503,
    );
  }

  const text = await response.text();
  if (text.length > 300_000) {
    throw new ExecutionError(
      "execution_invalid_response",
      "The execution service returned an unexpectedly large response.",
      502,
    );
  }

  if (response.status === 429) {
    throw new ExecutionError(
      "execution_rate_limited",
      "The execution service is rate limiting requests. Try again shortly.",
      429,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new ExecutionError(
      "execution_auth_failed",
      "The execution service rejected the configured credentials. Check CODE_EXECUTION_API_KEY.",
      503,
    );
  }

  if (!response.ok) {
    throw new ExecutionError(
      "execution_provider_error",
      `The execution provider returned HTTP ${response.status}.`,
      response.status >= 500 ? 503 : 502,
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ExecutionError(
      "execution_invalid_response",
      "The execution service returned a response that could not be read.",
      502,
    );
  }
}

async function getSubmission(token, config) {
  const url = `${config.base}/submissions/${encodeURIComponent(
    token,
  )}?base64_encoded=false&fields=token,status,stdout,stderr,compile_output,message,time,memory,exit_code`;
  return requestJson(url, { method: "GET" }, 15000);
}

/**
 * Execute Python through Judge0 and normalize the response. Tests are appended
 * server-side; hidden test code never leaves the server.
 */
export async function executePython({ code, tests = [] }) {
  const config = baseUrl();

  if (!config.configured) {
    throw new ExecutionError(
      "execution_not_configured",
      "Code execution is not configured. Add CODE_EXECUTION_API_URL in .env.local.",
      503,
    );
  }

  const harness = tests.length > 0
    ? buildTestHarness({ tests, nonce: undefined })
    : null;
  const source = harness ? `${code}\n${harness.code}` : code;

  const submitBody = {
    source_code: source,
    language_id: Number(config.languageId) || 71,
    stdin: "",
    cpu_time_limit: 5,
    wall_time_limit: 10,
    memory_limit: 128000,
  };

  const submission = await requestJson(
    `${config.base}/submissions?base64_encoded=false`,
    {
      method: "POST",
      body: JSON.stringify(submitBody),
    },
    Math.min(config.timeoutMs, 20000),
  );

  let result = normalizeJudge0Result(submission);
  const token = result.providerSubmissionId;

  if (!token) {
    throw new ExecutionError(
      "execution_invalid_response",
      "The execution service did not return a submission identifier.",
      502,
    );
  }

  const deadline = Date.now() + config.timeoutMs;
  while (!result.finished && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    const payload = await getSubmission(token, config);
    result = normalizeJudge0Result({ ...payload, token });
  }

  if (!result.finished) {
    result = {
      ...result,
      status: "processing",
      rawDescription:
        "The execution service is still processing this submission. You can check again shortly.",
    };
  }

  if (harness && result.status === "success") {
    const { stdout, results } = parseTestResults(result.stdout, {
      marker: harness.marker,
      tests,
    });
    result = { ...result, stdout, tests: results };

    if (!results) {
      result = {
        ...result,
        status: "test_failure",
        stderr:
          `${result.stderr}\nThe test harness did not report results. The program may have exited before the checks ran.`.trim(),
      };
    } else if (!allTestsPassed(results, tests)) {
      result = { ...result, status: "test_failure" };
    }
  } else if (harness) {
    result = { ...result, tests: null };
  }

  // Never return the original test definitions (which may contain hidden
  // assertions). Only the sanitized parser output may leave the server.
  return { ...result, tests: harness ? result.tests || null : null };
}

export async function getExecutionStatus(token) {
  if (!/^[a-f0-9-]{8,64}$/i.test(String(token || ""))) {
    throw new ExecutionError("invalid_request", "Invalid submission token.", 400);
  }
  const config = baseUrl();
  if (!config.configured) {
    throw new ExecutionError(
      "execution_not_configured",
      "Code execution is not configured.",
      503,
    );
  }
  const payload = await getSubmission(token, config);
  return normalizeJudge0Result({ ...payload, token });
}
