import { CheckCircle2, Terminal, TriangleAlert, XCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import {
  describeExecutionStatus,
  executionTone,
} from "@/lib/execution/normalize";
import { formatDuration } from "@/lib/utils/format";
import styles from "./ExecutionResult.module.css";

export function normalizeAttempt(attempt) {
  if (!attempt) return null;
  return {
    status: attempt.execution_status || attempt.status,
    stdout: attempt.stdout || "",
    stderr: attempt.stderr || "",
    exitCode: attempt.exit_code ?? attempt.exitCode ?? null,
    durationMs: attempt.duration_ms ?? attempt.durationMs ?? null,
    tests: Array.isArray(attempt.test_results)
      ? attempt.test_results
      : Array.isArray(attempt.tests)
        ? attempt.tests
        : [],
    allTestsPassed:
      Array.isArray(attempt.test_results) && attempt.test_results.length
        ? attempt.test_results.every((test) => test.passed)
        : attempt.allTestsPassed ?? null,
    persistedAt: attempt.created_at,
  };
}

export default function ExecutionResult({ result, label = "isolated Python runner" }) {
  if (!result) return null;
  const tests = Array.isArray(result.tests) ? result.tests : [];
  const tone = executionTone(result.status);
  const hiddenCount = tests.filter((test) => test.hidden).length;

  return (
    <div className={styles.result} aria-live="polite">
      <div className={styles.head}>
        <Badge tone={tone} dot>
          {describeExecutionStatus(result.status)}
        </Badge>
        <span className={styles.meta}>
          {result.durationMs != null ? `${formatDuration(result.durationMs)} · ` : ""}
          {label}
        </span>
        {result.allTestsPassed === true ? (
          <span className={styles.pass}>
            <CheckCircle2 size={13} aria-hidden="true" /> All checks passed
          </span>
        ) : result.allTestsPassed === false ? (
          <span className={styles.fail}>
            <XCircle size={13} aria-hidden="true" /> Some checks failed
          </span>
        ) : null}
      </div>

      {tests.length ? (
        <ul className={styles.tests}>
          {tests.map((test, index) => (
            <li
              key={`${test.name}-${index}`}
              className={`${styles.test} ${test.passed ? styles.testPass : styles.testFail}`}
            >
              {test.passed ? (
                <CheckCircle2 size={13} aria-hidden="true" />
              ) : (
                <XCircle size={13} aria-hidden="true" />
              )}
              <span className={styles.testName}>
                {test.hidden ? "Hidden check" : test.name}
              </span>
              {test.hidden ? (
                <span className={styles.testHidden}>details withheld</span>
              ) : test.detail ? (
                <span className={styles.testDetail}>{test.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {hiddenCount ? (
        <p className={styles.hiddenNote}>
          {hiddenCount} {hiddenCount === 1 ? "check is" : "checks are"} hidden by
          design. Only pass/fail status is shown so the checks stay useful.
        </p>
      ) : null}

      <div className={styles.consoleGrid}>
        <div className={styles.consoleBlock}>
          <p className={styles.consoleLabel}>
            <Terminal size={11} aria-hidden="true" /> stdout
          </p>
          <pre>{result.stdout || "(no output)"}</pre>
        </div>
        <div className={styles.consoleBlock}>
          <p className={styles.consoleLabel}>
            <TriangleAlert size={11} aria-hidden="true" /> stderr
          </p>
          <pre className={result.stderr ? styles.stderr : ""}>
            {result.stderr || "(no errors)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
