import { describe, expect, it } from "vitest";
import {
  describeExecutionStatus,
  executionTone,
  isSuccessfulExecution,
  normalizeJudge0Result,
} from "@/lib/execution/normalize";

describe("normalizeJudge0Result", () => {
  it("reports an unavailable service for an empty payload", () => {
    const result = normalizeJudge0Result(null);
    expect(result.status).toBe("service_unavailable");
    expect(result.finished).toBe(false);
    expect(result.stdout).toBe("");
    expect(result.durationMs).toBeNull();
  });

  it("maps an accepted submission to success and normalizes output", () => {
    const result = normalizeJudge0Result({
      token: "abc",
      stdout: "hello\r\nworld\r\n",
      stderr: "",
      exit_code: 0,
      time: "0.012",
      status: { id: 3, description: "Accepted" },
    });

    expect(result.status).toBe("success");
    expect(result.stdout).toBe("hello\nworld\n");
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBe(12);
    expect(result.providerSubmissionId).toBe("abc");
    expect(result.finished).toBe(true);
  });

  it("maps processing, timeout, syntax, and runtime statuses", () => {
    expect(normalizeJudge0Result({ status: { id: 2 } }).status).toBe("processing");
    expect(normalizeJudge0Result({ status: { id: 5 } }).status).toBe("timeout");
    expect(normalizeJudge0Result({ status: { id: 6 } }).status).toBe("syntax_error");
    expect(normalizeJudge0Result({ status: { id: 9 } }).status).toBe("runtime_error");
    expect(normalizeJudge0Result({ status: { id: 14 } }).status).toBe("syntax_error");
    expect(normalizeJudge0Result({ status: { id: 13 } }).status).toBe(
      "service_unavailable",
    );
  });

  it("treats a compiler-reported SyntaxError as a syntax error", () => {
    const result = normalizeJudge0Result({
      status: { id: 3, description: "Accepted" },
      stderr: "SyntaxError: invalid syntax",
    });
    expect(result.status).toBe("syntax_error");
  });

  it("combines compile output and stderr", () => {
    const result = normalizeJudge0Result({
      status: { id: 6 },
      compile_output: "line 1: bad token",
      stderr: "more detail",
    });
    expect(result.stderr).toBe("line 1: bad token\nmore detail");
  });

  it("does not claim success for test failures", () => {
    const result = normalizeJudge0Result({ status: { id: 4 } });
    expect(result.status).toBe("test_failure");
    expect(isSuccessfulExecution(result)).toBe(false);
  });
});

describe("execution presentation", () => {
  it("uses semantic tones without inventing success", () => {
    expect(executionTone("success")).toBe("success");
    expect(executionTone("test_failure")).toBe("danger");
    expect(executionTone("timeout")).toBe("danger");
    expect(executionTone("processing")).toBe("warning");
    expect(executionTone("unknown")).toBe("neutral");
  });

  it("describes every supported status", () => {
    expect(describeExecutionStatus("success")).toBe("Ran successfully");
    expect(describeExecutionStatus("test_failure")).toBe("Tests failed");
    expect(describeExecutionStatus("service_unavailable")).toBe(
      "Execution service unavailable",
    );
    expect(describeExecutionStatus("not-a-status")).toBe("Unknown result");
  });
});
