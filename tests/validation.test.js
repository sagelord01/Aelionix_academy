import { describe, expect, it } from "vitest";
import {
  assessmentAnswerSchema,
  codeRunSchema,
  deleteAccountSchema,
  draftSchema,
  emailSchema,
  explorationSchema,
  firstZodError,
  reviewAnswerSchema,
  settingsSchema,
  signUpSchema,
  tutorRequestSchema,
} from "@/lib/validation/schemas";

const settings = {
  displayName: "Ada",
  learningGoal: "projects",
  experienceLevel: "beginner",
  preferredMode: "coach",
  weeklyMinutes: "120",
  hintPreference: "balanced",
};

describe("settings and onboarding", () => {
  it("coerces weekly minutes and accepts a valid profile", () => {
    const result = settingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
    expect(result.data.weeklyMinutes).toBe(120);
  });

  it("rejects unknown tutor modes", () => {
    expect(
      settingsSchema.safeParse({ ...settings, preferredMode: "autopilot" }).success,
    ).toBe(false);
  });

  it("enforces weekly minute bounds", () => {
    expect(
      settingsSchema.safeParse({ ...settings, weeklyMinutes: 10 }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...settings, weeklyMinutes: 5000 }).success,
    ).toBe(false);
  });

  it("requires a usable display name and password at sign-up", () => {
    expect(
      signUpSchema.safeParse({
        displayName: "A",
        email: "ada@example.com",
        password: "longenough",
      }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({
        displayName: "Ada",
        email: "ada@example.com",
        password: "short",
      }).success,
    ).toBe(false);
  });
});

describe("learner input", () => {
  it("defaults a code run to run mode", () => {
    const result = codeRunSchema.safeParse({ code: "print(1)" });
    expect(result.success).toBe(true);
    expect(result.data.mode).toBe("run");
    expect(result.data.language).toBeUndefined();
  });

  it("rejects empty code and oversized submissions", () => {
    expect(codeRunSchema.safeParse({ code: "" }).success).toBe(false);
    expect(
      codeRunSchema.safeParse({ code: "x".repeat(20001) }).success,
    ).toBe(false);
  });

  it("validates draft ownership fields", () => {
    expect(
      draftSchema.safeParse({
        exerciseId: "not-a-uuid",
        code: "x = 1",
      }).success,
    ).toBe(false);
    expect(
      draftSchema.safeParse({
        exerciseId: "00000000-0000-4000-8000-000000000001",
        code: "x = 1",
      }).success,
    ).toBe(true);
  });

  it("defaults an empty tutor context and response body", () => {
    const result = tutorRequestSchema.safeParse({
      message: "Why?",
      mode: "partner",
    });
    expect(result.success).toBe(true);
    expect(result.data.code).toBe("");
    expect(result.data.currentQuestion).toBe("");
  });

  it("defaults assessment and review payloads", () => {
    const answer = assessmentAnswerSchema.safeParse({
      attemptId: "00000000-0000-4000-8000-000000000001",
      questionId: "00000000-0000-4000-8000-000000000002",
    });
    expect(answer.success).toBe(true);
    expect(answer.data.skip).toBe(false);
    expect(answer.data.response).toEqual({});

    const review = reviewAnswerSchema.safeParse({
      itemId: "00000000-0000-4000-8000-000000000003",
    });
    expect(review.success).toBe(true);
    expect(review.data.confidence).toBe("medium");
  });

  it("requires an exploration topic with substance", () => {
    expect(explorationSchema.safeParse({ topic: "ab" }).success).toBe(false);
    expect(explorationSchema.safeParse({ topic: "decorators" }).success).toBe(
      true,
    );
  });

  it("requires the exact deletion confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({ password: "secret", confirmation: "delete" })
        .success,
    ).toBe(false);
    expect(
      deleteAccountSchema.safeParse({ password: "secret", confirmation: "DELETE" })
        .success,
    ).toBe(true);
  });
});

describe("email and error presentation", () => {
  it("normalizes and validates email addresses", () => {
    const result = emailSchema.safeParse("  ada@example.com ");
    expect(result.success).toBe(true);
    expect(result.data).toBe("ada@example.com");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("returns the first issue message", () => {
    const result = settingsSchema.safeParse({});
    expect(firstZodError(result)).toBeTruthy();
    expect(typeof firstZodError(result)).toBe("string");
    expect(firstZodError({ success: true })).toBeNull();
  });
});
