/**
 * Normalize a Judge0 submission into the application's provider-independent
 * execution result.
 */
export function normalizeJudge0Result(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      status: "service_unavailable",
      stdout: "",
      stderr: "",
      exitCode: null,
      durationMs: null,
      providerSubmissionId: null,
      providerStatus: null,
      rawDescription: "Empty response from execution provider",
      finished: false,
    };
  }

  const stdout = typeof payload.stdout === "string" ? payload.stdout : "";
  const stderr = typeof payload.stderr === "string" ? payload.stderr : "";
  const compileOutput = typeof payload.compile_output === "string" ? payload.compile_output : "";
  const message = typeof payload.message === "string" ? payload.message : "";
  const statusId = Number(payload.status?.id ?? 0);
  const description = payload.status?.description || "";
  const time = Number(payload.time);
  const exitCode =
    payload.exit_code === null || payload.exit_code === undefined
      ? null
      : Number(payload.exit_code);

  let status = "unknown";

  if (statusId === 1 || statusId === 2) {
    status = "processing";
  } else if (statusId === 3) {
    status = "success";
  } else if (statusId === 4) {
    status = "test_failure";
  } else if (statusId === 5) {
    status = "timeout";
  } else if (statusId === 6) {
    status = "syntax_error";
  } else if (statusId >= 7 && statusId <= 12) {
    status = "runtime_error";
  } else if (statusId === 13) {
    status = "service_unavailable";
  } else if (statusId === 14) {
    status = "syntax_error";
  }

  const combinedError = `${compileOutput}\n${stderr}`;
  if (
    status === "success" &&
    /SyntaxError|IndentationError|TabError/i.test(combinedError)
  ) {
    status = "syntax_error";
  }

  const cleanStdout = stdout.replace(/\r\n/g, "\n");
  const cleanStderr = stderr.replace(/\r\n/g, "\n");

  return {
    status,
    stdout: cleanStdout,
    stderr: [compileOutput, cleanStderr].filter(Boolean).join("\n").trim(),
    exitCode: Number.isFinite(exitCode) ? exitCode : null,
    durationMs: Number.isFinite(time) ? Math.round(time * 1000) : null,
    providerSubmissionId: payload.token || null,
    providerStatus: statusId ? { id: statusId, description } : null,
    rawDescription: description || message || "",
    finished: !(statusId === 1 || statusId === 2),
  };
}

export function isSuccessfulExecution(result) {
  return result?.status === "success";
}

export function executionTone(status) {
  switch (status) {
    case "success":
      return "success";
    case "test_failure":
    case "runtime_error":
    case "syntax_error":
    case "timeout":
      return "danger";
    case "service_unavailable":
    case "invalid_request":
    case "processing":
      return "warning";
    default:
      return "neutral";
  }
}

export function describeExecutionStatus(status) {
  switch (status) {
    case "success":
      return "Ran successfully";
    case "test_failure":
      return "Tests failed";
    case "runtime_error":
      return "Runtime error";
    case "syntax_error":
      return "Syntax error";
    case "timeout":
      return "Time limit exceeded";
    case "service_unavailable":
      return "Execution service unavailable";
    case "invalid_request":
      return "Invalid submission";
    case "processing":
      return "Still processing";
    default:
      return "Unknown result";
  }
}
