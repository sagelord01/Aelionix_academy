import { describe, expect, it } from "vitest";
import {
  allTestsPassed,
  buildTestHarness,
  parseTestResults,
} from "@/lib/execution/harness";

const nonce = "0123456789abcdef0123456789abcdef";

describe("buildTestHarness", () => {
  it("uses the provided nonce and encodes the tests", () => {
    const harness = buildTestHarness({
      nonce,
      tests: [{ name: "adds numbers", code: "assert 1 + 1 == 2" }],
    });

    expect(harness.marker).toBe(`__LW_RESULTS_${nonce}__`);
    expect(harness.nonce).toBe(nonce);
    expect(harness.code).toContain(harness.marker);
    expect(harness.code).toContain("base64");

    const encoded = harness.code.match(/b64decode\("([^"]+)"\)/)[1];
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    expect(decoded).toEqual([
      { name: "adds numbers", code: "assert 1 + 1 == 2" },
    ]);
  });

  it("replaces an invalid nonce with a random one", () => {
    const harness = buildTestHarness({
      nonce: "not-a-valid-nonce",
      tests: [],
    });
    expect(harness.nonce).not.toBe("not-a-valid-nonce");
    expect(harness.nonce).toMatch(/^[a-f0-9]{32}$/);
  });
});

describe("parseTestResults", () => {
  const tests = [
    { name: "visible check", hidden: false },
    { name: "hidden check", hidden: true },
  ];

  it("returns original stdout when the marker is absent", () => {
    const parsed = parseTestResults("plain output\n", {
      marker: "__LW_RESULTS_missing__",
      tests,
    });
    expect(parsed.stdout).toBe("plain output\n");
    expect(parsed.results).toBeNull();
  });

  it("extracts results and removes the marker line from stdout", () => {
    const payload = [
      { name: "visible check", passed: true, detail: "" },
      { name: "hidden check", passed: false, detail: "secret assertion text" },
    ];
    const stdout = `hello\n__LW_RESULTS_${nonce}__${JSON.stringify(payload)}\n`;

    const parsed = parseTestResults(stdout, {
      marker: `__LW_RESULTS_${nonce}__`,
      tests,
    });

    expect(parsed.stdout).toBe("hello\n");
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]).toMatchObject({
      name: "visible check",
      passed: true,
      hidden: false,
    });
    expect(parsed.results[1]).toMatchObject({
      name: "Hidden check 1",
      passed: false,
      hidden: true,
      detail: "",
    });
  });

  it("hides details for hidden checks and keeps visible failure details", () => {
    const payload = [
      { name: "visible check", passed: false, detail: "expected 2" },
      { name: "hidden check", passed: false, detail: "do not reveal me" },
    ];
    const stdout = `__LW_RESULTS_${nonce}__${JSON.stringify(payload)}`;

    const parsed = parseTestResults(stdout, {
      marker: `__LW_RESULTS_${nonce}__`,
      tests,
    });

    expect(parsed.results[0].detail).toBe("expected 2");
    expect(parsed.results[1].detail).toBe("");
  });

  it("marks tests that never reported as failed", () => {
    const payload = [{ name: "visible check", passed: true }];
    const stdout = `__LW_RESULTS_${nonce}__${JSON.stringify(payload)}`;

    const parsed = parseTestResults(stdout, {
      marker: `__LW_RESULTS_${nonce}__`,
      tests,
    });

    const missing = parsed.results.find((result) => result.hidden);
    expect(missing.passed).toBe(false);
    expect(missing.detail).toBe("");
  });

  it("ignores forged or unknown test names", () => {
    const payload = [
      { name: "not a real test", passed: true },
      { name: "hidden check", passed: true },
    ];
    const stdout = `__LW_RESULTS_${nonce}__${JSON.stringify(payload)}`;

    const parsed = parseTestResults(stdout, {
      marker: `__LW_RESULTS_${nonce}__`,
      tests,
    });

    expect(parsed.results).toHaveLength(2);
    expect(parsed.results.some((result) => result.name === "not a real test")).toBe(
      false,
    );
  });

  it("returns null results for malformed JSON", () => {
    const stdout = `__LW_RESULTS_${nonce}__not-json`;
    const parsed = parseTestResults(stdout, {
      marker: `__LW_RESULTS_${nonce}__`,
      tests,
    });
    expect(parsed.results).toBeNull();
  });
});

describe("allTestsPassed", () => {
  const tests = [{ name: "a" }, { name: "b" }];

  it("requires results for every expected test", () => {
    expect(
      allTestsPassed([{ passed: true }, { passed: true }], tests),
    ).toBe(true);
    expect(allTestsPassed([{ passed: true }], tests)).toBe(false);
    expect(
      allTestsPassed([{ passed: true }, { passed: false }], tests),
    ).toBe(false);
    expect(allTestsPassed(null, tests)).toBe(false);
  });
});
