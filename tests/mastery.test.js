import { describe, expect, it } from "vitest";
import {
  applyEvidence,
  deriveMasteryStatus,
  MASTERY_LABELS,
  masteryTone,
} from "@/lib/progress/mastery";

describe("deriveMasteryStatus", () => {
  it("has no status before evidence exists", () => {
    expect(deriveMasteryStatus()).toBe("not_assessed");
    expect(deriveMasteryStatus({ evidenceCount: 0 })).toBe("not_assessed");
  });

  it("requires more than one evidence item", () => {
    expect(
      deriveMasteryStatus({
        evidenceCount: 1,
        correctCount: 1,
        practicalSuccesses: 1,
      }),
    ).toBe("insufficient_evidence");
  });

  it("marks low accuracy as developing", () => {
    expect(
      deriveMasteryStatus({
        evidenceCount: 4,
        correctCount: 2,
        practicalSuccesses: 1,
      }),
    ).toBe("developing");
  });

  it("requires both accuracy and practical success for demonstrated", () => {
    expect(
      deriveMasteryStatus({
        evidenceCount: 4,
        correctCount: 3,
        practicalSuccesses: 0,
      }),
    ).toBe("developing");
    expect(
      deriveMasteryStatus({
        evidenceCount: 4,
        correctCount: 3,
        practicalSuccesses: 1,
      }),
    ).toBe("demonstrated");
  });

  it("requires four items, 85% accuracy, and two practical successes for a challenge", () => {
    expect(
      deriveMasteryStatus({
        evidenceCount: 4,
        correctCount: 4,
        practicalSuccesses: 1,
      }),
    ).toBe("demonstrated");
    expect(
      deriveMasteryStatus({
        evidenceCount: 4,
        correctCount: 4,
        practicalSuccesses: 2,
      }),
    ).toBe("ready_for_challenge");
    expect(
      deriveMasteryStatus({
        evidenceCount: 3,
        correctCount: 3,
        practicalSuccesses: 2,
      }),
    ).toBe("demonstrated");
  });
});

describe("applyEvidence", () => {
  it("increments evidence and keeps practical success tied to correctness", () => {
    const first = applyEvidence(
      { evidence_count: 0, correct_count: 0, practical_successes: 0 },
      { correct: true, practical: true },
    );
    expect(first).toEqual({
      evidenceCount: 1,
      correctCount: 1,
      practicalSuccesses: 1,
      status: "insufficient_evidence",
    });

    const second = applyEvidence(first, { correct: false, practical: true });
    expect(second.evidenceCount).toBe(2);
    expect(second.correctCount).toBe(1);
    expect(second.practicalSuccesses).toBe(1);
    expect(second.status).toBe("developing");
  });

  it("does not count a practical attempt that was incorrect", () => {
    const result = applyEvidence(
      { evidence_count: 2, correct_count: 1, practical_successes: 0 },
      { correct: false, practical: true },
    );
    expect(result.practicalSuccesses).toBe(0);
    expect(result.evidenceCount).toBe(3);
  });
});

describe("mastery presentation", () => {
  it("has a label for every status", () => {
    for (const status of [
      "not_assessed",
      "insufficient_evidence",
      "developing",
      "demonstrated",
      "ready_for_challenge",
    ]) {
      expect(typeof MASTERY_LABELS[status]).toBe("string");
      expect(MASTERY_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it("maps status to a badge tone", () => {
    expect(masteryTone("ready_for_challenge")).toBe("success");
    expect(masteryTone("demonstrated")).toBe("success");
    expect(masteryTone("developing")).toBe("warning");
    expect(masteryTone("insufficient_evidence")).toBe("neutral");
    expect(masteryTone("not_assessed")).toBe("neutral");
  });
});
