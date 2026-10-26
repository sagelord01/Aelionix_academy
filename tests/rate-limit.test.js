import { beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  checkMemoryRateLimit,
  enforceRateLimit,
  resetMemoryRateLimits,
} from "@/lib/security/rate-limit";

const config = { limit: 2, windowMs: 1000, label: "test actions" };

beforeEach(() => {
  resetMemoryRateLimits();
});

describe("checkMemoryRateLimit", () => {
  it("allows requests up to the configured limit", () => {
    const key = "user:one";
    expect(checkMemoryRateLimit(key, config, 1000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(checkMemoryRateLimit(key, config, 1200)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    const blocked = checkMemoryRateLimit(key, config, 1400);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBe(600);
  });

  it("resets the window after it expires", () => {
    const key = "user:two";
    checkMemoryRateLimit(key, config, 1000);
    checkMemoryRateLimit(key, config, 1100);
    expect(checkMemoryRateLimit(key, config, 2101).allowed).toBe(true);
  });

  it("keeps separate counters per key", () => {
    expect(checkMemoryRateLimit("a", config, 1000).allowed).toBe(true);
    expect(checkMemoryRateLimit("a", config, 1000).allowed).toBe(true);
    expect(checkMemoryRateLimit("a", config, 1000).allowed).toBe(false);
    expect(checkMemoryRateLimit("b", config, 1000).allowed).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  it("uses the in-memory guard when no admin client is available", async () => {
    const now = new Date("2026-10-25T12:00:00.000Z");
    const args = {
      admin: null,
      userId: "00000000-0000-4000-8000-000000000001",
      kind: "ai",
      config: { limit: 1, windowMs: 60_000, label: "test actions" },
      now,
    };

    const first = await enforceRateLimit(args);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);

    const second = await enforceRateLimit(args);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterMs).toBe(60_000);
    expect(second.message).toContain("test actions");
  });

  it("exposes non-atomic operational limits for every expensive route", () => {
    expect(RATE_LIMITS.ai.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.execution.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.assessment.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.review.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.explore.limit).toBeGreaterThan(0);
  });

  it("rejects an unknown kind without a config", async () => {
    await expect(
      enforceRateLimit({
        admin: null,
        userId: "u",
        kind: "unknown-kind",
      }),
    ).rejects.toThrow("Unknown rate-limit kind");
  });
});
