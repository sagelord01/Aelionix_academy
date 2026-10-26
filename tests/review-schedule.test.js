import { describe, expect, it } from "vitest";
import {
  MAX_INTERVAL_DAYS,
  isDue,
  qualityFromResult,
  scheduleReview,
} from "@/lib/review/schedule";

const now = new Date("2026-10-25T12:00:00.000Z");

describe("scheduleReview", () => {
  it("schedules the first successful recall for one day later", () => {
    const next = scheduleReview(
      { intervalDays: 1, repetitions: 0, ease: 2.5, lapses: 0 },
      4,
      now,
    );

    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(1);
    expect(next.ease).toBe(2.5);
    expect(next.lapses).toBe(0);
    expect(next.dueAt.toISOString()).toBe("2026-10-26T12:00:00.000Z");
  });

  it("moves the second success to three days", () => {
    const next = scheduleReview(
      { intervalDays: 1, repetitions: 1, ease: 2.5, lapses: 0 },
      4,
      now,
    );
    expect(next.repetitions).toBe(2);
    expect(next.intervalDays).toBe(3);
  });

  it("grows the interval by ease after two successes", () => {
    const next = scheduleReview(
      { intervalDays: 3, repetitions: 2, ease: 2.5, lapses: 0 },
      5,
      now,
    );
    expect(next.repetitions).toBe(3);
    expect(next.intervalDays).toBe(8);
    expect(next.ease).toBe(2.6);
  });

  it("resets a failed recall and records a lapse", () => {
    const next = scheduleReview(
      { intervalDays: 20, repetitions: 5, ease: 2.5, lapses: 1 },
      1,
      now,
    );
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBe(1);
    expect(next.lapses).toBe(2);
    expect(next.ease).toBe(2.3);
    expect(next.dueAt.toISOString()).toBe("2026-10-26T12:00:00.000Z");
  });

  it("never exceeds the maximum interval", () => {
    const next = scheduleReview(
      { intervalDays: 170, repetitions: 8, ease: 3.5, lapses: 0 },
      5,
      now,
    );
    expect(next.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it("clamps quality and ease inputs", () => {
    const next = scheduleReview(
      { intervalDays: 1, repetitions: 1, ease: 99, lapses: 0 },
      99,
      now,
    );
    expect(next.quality).toBe(5);
    expect(next.ease).toBe(3.5);

    const low = scheduleReview(
      { intervalDays: 1, repetitions: 1, ease: 1, lapses: 0 },
      0,
      now,
    );
    expect(low.quality).toBe(0);
    expect(low.ease).toBe(1.3);
  });
});

describe("qualityFromResult", () => {
  it("maps correctness and confidence to a transparent quality score", () => {
    expect(qualityFromResult({ correct: true, confidence: "high" })).toBe(5);
    expect(qualityFromResult({ correct: true, confidence: "medium" })).toBe(4);
    expect(qualityFromResult({ correct: true, confidence: "low" })).toBe(3);
    expect(qualityFromResult({ correct: false, confidence: "high" })).toBe(1);
    expect(qualityFromResult({ correct: false, confidence: "low" })).toBe(2);
  });
});

describe("isDue", () => {
  it("compares the due timestamp to the supplied time", () => {
    expect(isDue({ due_at: "2026-10-25T11:00:00.000Z" }, now)).toBe(true);
    expect(isDue({ due_at: "2026-10-25T13:00:00.000Z" }, now)).toBe(false);
    expect(isDue({}, now)).toBe(false);
    expect(isDue(null, now)).toBe(false);
  });
});
