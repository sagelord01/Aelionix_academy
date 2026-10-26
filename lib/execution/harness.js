import { randomBytes } from "node:crypto";

/**
 * Build a Python test harness appended to the learner's submission. It runs
 * inside the isolated execution provider, never in Next.js. The result marker
 * contains a per-run nonce so a submission cannot reliably forge test output.
 */
export function buildTestHarness({ tests = [], nonce }) {
  const safeNonce = /^[a-f0-9]{16,64}$/i.test(nonce)
    ? nonce
    : randomBytes(16).toString("hex");
  const payload = tests.map((test) => ({
    name: test.name,
    code: test.code,
  }));
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const marker = `__LW_RESULTS_${safeNonce}__`;

  return {
    marker,
    nonce: safeNonce,
    code: `

# --- Learning Workspace test harness ---
import json as _lw_json
import base64 as _lw_base64
import traceback as _lw_traceback

_lw_spec = _lw_json.loads(_lw_base64.b64decode("${encoded}").decode("utf-8"))
_lw_results = []
for _lw_test in _lw_spec:
    try:
        exec(_lw_test["code"], globals())
        _lw_results.append({"name": _lw_test["name"], "passed": True, "detail": ""})
    except AssertionError as _lw_error:
        _lw_results.append({"name": _lw_test["name"], "passed": False, "detail": str(_lw_error) or "assertion failed"})
    except Exception as _lw_error:
        _lw_results.append({"name": _lw_test["name"], "passed": False, "detail": type(_lw_error).__name__ + ": " + str(_lw_error)})
print("${marker}" + _lw_json.dumps(_lw_results))
# --- end test harness ---
`,
  };
}

export function parseTestResults(stdout, { marker, tests = [] } = {}) {
  if (!stdout || !marker) {
    return { stdout: stdout || "", results: null };
  }

  const index = stdout.lastIndexOf(marker);
  if (index === -1) {
    return { stdout, results: null };
  }

  const before = stdout.slice(0, index).replace(/\n+$/, "\n");
  const jsonText = stdout.slice(index + marker.length).split("\n")[0];
  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { stdout: before, results: null };
  }

  if (!Array.isArray(parsed)) {
    return { stdout: before, results: null };
  }

  const expectedByName = new Map(tests.map((test) => [test.name, test]));
  const results = [];
  const seen = new Set();

  for (const item of parsed) {
    if (!item || typeof item.name !== "string") continue;
    const expected = expectedByName.get(item.name);
    if (!expected || seen.has(item.name)) continue;
    seen.add(item.name);
    const hidden = Boolean(expected.hidden);
    results.push({
      name: hidden ? `Hidden check ${results.filter((result) => result.hidden).length + 1}` : item.name,
      passed: item.passed === true,
      hidden,
      detail:
        !hidden && item.passed !== true && typeof item.detail === "string"
          ? item.detail.slice(0, 400)
          : "",
    });
  }

  for (const test of tests) {
    if (seen.has(test.name)) continue;
    const hidden = Boolean(test.hidden);
    results.push({
      name: hidden
        ? `Hidden check ${results.filter((result) => result.hidden).length + 1}`
        : test.name,
      passed: false,
      hidden,
      detail: hidden ? "" : "This check did not run. The program may have stopped before the tests.",
    });
  }

  return { stdout: before, results };
}

export function allTestsPassed(results, tests = []) {
  return (
    Array.isArray(results) &&
    results.length >= tests.length &&
    results.every((result) => result.passed)
  );
}
