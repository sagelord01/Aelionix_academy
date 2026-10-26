import { describe, expect, it } from "vitest";
import {
  acceptedValues,
  describeResponse,
  gradeTextOrChoice,
  matchesTextAnswer,
} from "@/lib/assessment/grade";

describe("acceptedValues", () => {
  it("collects the primary and alternate answers", () => {
    expect(
      acceptedValues({ value: "42", acceptedAnswers: ["forty-two", 9] }),
    ).toEqual(["42", "forty-two"]);
  });

  it("returns an empty list for an empty key", () => {
    expect(acceptedValues()).toEqual([]);
  });
});

describe("matchesTextAnswer", () => {
  it("matches exact and case-insensitive text", () => {
    expect(matchesTextAnswer({ value: "Hello" }, "Hello")).toBe(true);
    expect(matchesTextAnswer({ value: "Hello" }, "hello")).toBe(true);
  });

  it("normalizes whitespace and line endings", () => {
    expect(matchesTextAnswer({ value: "a  b" }, "a\r\n b")).toBe(true);
  });

  it("compares numeric answers by value", () => {
    expect(matchesTextAnswer({ value: "3" }, "3.0")).toBe(true);
    expect(matchesTextAnswer({ value: "-2.5" }, "-2.50")).toBe(true);
    expect(matchesTextAnswer({ value: "3" }, "4")).toBe(false);
  });

  it("uses alternate accepted answers", () => {
    expect(
      matchesTextAnswer(
        { value: "color", acceptedAnswers: ["colour"] },
        "colour",
      ),
    ).toBe(true);
  });

  it("rejects empty submissions", () => {
    expect(matchesTextAnswer({ value: "anything" }, "   ")).toBe(false);
    expect(matchesTextAnswer({ value: "anything" }, undefined)).toBe(false);
  });
});

describe("gradeTextOrChoice", () => {
  const multipleChoice = { type: "multiple_choice" };

  it("compares multiple-choice option ids as strings", () => {
    expect(
      gradeTextOrChoice(multipleChoice, { optionId: 2 }, { optionId: "2" }),
    ).toBe(true);
    expect(
      gradeTextOrChoice(multipleChoice, { optionId: "2" }, { optionId: "3" }),
    ).toBe(false);
    expect(gradeTextOrChoice(multipleChoice, { optionId: "2" }, {})).toBe(false);
  });

  it("grades code output and short answers as text", () => {
    expect(
      gradeTextOrChoice(
        { type: "code_output" },
        { value: "12" },
        { value: "12" },
      ),
    ).toBe(true);
    expect(
      gradeTextOrChoice(
        { type: "short_answer" },
        { value: "a list" },
        { value: "A LIST" },
      ),
    ).toBe(true);
  });

  it("does not grade a practical code question here", () => {
    expect(
      gradeTextOrChoice({ type: "code" }, { value: "x" }, { value: "x" }),
    ).toBe(false);
  });

  it("returns false without a question or key", () => {
    expect(gradeTextOrChoice(null, {}, {})).toBe(false);
    expect(gradeTextOrChoice(multipleChoice, null, {})).toBe(false);
  });
});

describe("describeResponse", () => {
  it("resolves the chosen option text", () => {
    expect(
      describeResponse(
        {
          type: "multiple_choice",
          options: [
            { id: "0", text: "First" },
            { id: "1", text: "Second" },
          ],
        },
        { optionId: "1" },
      ),
    ).toBe("Second");
  });

  it("returns submitted code or text", () => {
    expect(describeResponse({ type: "code" }, { code: "print(1)" })).toBe(
      "print(1)",
    );
    expect(describeResponse({ type: "short_answer" }, { value: "answer" })).toBe(
      "answer",
    );
  });

  it("returns an empty string for missing data", () => {
    expect(describeResponse(null, {})).toBe("");
    expect(describeResponse({ type: "short_answer" }, {})).toBe("");
  });
});
