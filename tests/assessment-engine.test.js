import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_TARGET,
  PRACTICAL_MIN_ANSWERED,
  questionPublicShape,
  selectNextQuestion,
  summarizeAssessment,
} from "@/lib/assessment/engine";

function question(id, difficulty, options = {}) {
  return {
    id,
    type: options.type || "multiple_choice",
    difficulty,
    position: options.position || 1,
    concept_slug: options.concept || id,
    concept_title: options.concept || id,
    prompt: `Question ${id}`,
  };
}

describe("selectNextQuestion", () => {
  it("stops at the assessment target", () => {
    const result = selectNextQuestion({
      questions: [question("a", 1)],
      answeredQuestionIds: [],
      answeredCount: ASSESSMENT_TARGET,
    });
    expect(result).toBeNull();
  });

  it("never repeats an answered question", () => {
    const result = selectNextQuestion({
      questions: [question("a", 1), question("b", 1, { position: 2 })],
      answeredQuestionIds: ["a"],
      answeredCount: 1,
    });
    expect(result?.id).toBe("b");
  });

  it("steps up in difficulty after a correct answer", () => {
    const result = selectNextQuestion({
      questions: [
        question("easy", 1),
        question("medium", 2),
        question("hard", 3),
      ],
      answeredQuestionIds: [],
      answeredCount: 2,
      lastDifficulty: 1,
      lastCorrect: true,
    });
    expect(result?.id).toBe("medium");
  });

  it("steps down in difficulty after an incorrect answer", () => {
    const result = selectNextQuestion({
      questions: [
        question("easy", 1),
        question("medium", 2),
        question("hard", 3),
      ],
      answeredQuestionIds: [],
      answeredCount: 2,
      lastDifficulty: 3,
      lastCorrect: false,
    });
    expect(result?.id).toBe("medium");
  });

  it("prefers an unseen concept over a repeated one", () => {
    const result = selectNextQuestion({
      questions: [
        question("seen", 1, { concept: "loops", position: 1 }),
        question("repeat", 1, { concept: "loops", position: 2 }),
        question("fresh", 1, { concept: "lists", position: 3 }),
      ],
      answeredQuestionIds: ["seen"],
      answeredCount: 1,
      lastDifficulty: 1,
      lastCorrect: true,
    });
    expect(result?.id).toBe("fresh");
  });

  it("withholds the practical question before enough evidence", () => {
    const questions = [
      question("practical", 1, { type: "code", concept: "code", position: 1 }),
      question("written", 1, { concept: "written", position: 2 }),
    ];

    const result = selectNextQuestion({
      questions,
      answeredQuestionIds: [],
      answeredCount: PRACTICAL_MIN_ANSWERED - 1,
      correctCount: PRACTICAL_MIN_ANSWERED - 1,
      lastDifficulty: 1,
      lastCorrect: true,
      executionAvailable: true,
    });

    expect(result?.type).toBe("multiple_choice");
  });

  it("withholds the practical question when early accuracy is below 60%", () => {
    const questions = [
      question("practical", 1, { type: "code", concept: "code", position: 1 }),
      question("written", 1, { concept: "written", position: 2 }),
    ];

    const result = selectNextQuestion({
      questions,
      answeredQuestionIds: [],
      answeredCount: 5,
      correctCount: 2,
      lastDifficulty: 1,
      lastCorrect: false,
      executionAvailable: true,
    });

    expect(result?.id).toBe("written");
  });

  it("offers the practical question once evidence supports it", () => {
    const questions = [
      question("practical", 1, { type: "code", concept: "code", position: 1 }),
      question("written", 1, { concept: "written", position: 2 }),
    ];

    const result = selectNextQuestion({
      questions,
      answeredQuestionIds: [],
      answeredCount: 5,
      correctCount: 4,
      lastDifficulty: 1,
      lastCorrect: true,
      executionAvailable: true,
    });

    expect(result?.id).toBe("practical");
  });

  it("excludes practical questions when execution is unavailable", () => {
    const result = selectNextQuestion({
      questions: [question("practical", 1, { type: "code" })],
      answeredQuestionIds: [],
      answeredCount: 5,
      correctCount: 5,
      executionAvailable: false,
    });
    expect(result).toBeNull();
  });
});

describe("summarizeAssessment", () => {
  const questions = [
    { id: "q1", concept_slug: "loops", concept_title: "Loops" },
    { id: "q2", concept_slug: "loops", concept_title: "Loops" },
    { id: "q3", concept_slug: "lists", concept_title: "Lists" },
  ];

  it("counts answered, correct, and skipped responses", () => {
    const summary = summarizeAssessment(
      [
        { question_id: "q1", is_correct: true, skipped: false },
        { question_id: "q2", is_correct: false, skipped: false },
        { question_id: "q3", is_correct: null, skipped: true },
      ],
      questions,
      [{}, {}],
    );

    expect(summary.answered).toBe(2);
    expect(summary.correct).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.accuracy).toBe(50);
    expect(summary.keysReviewed).toBe(2);
    expect(summary.concepts).toEqual([
      { slug: "loops", title: "Loops", answered: 2, correct: 1, skipped: 0 },
      { slug: "lists", title: "Lists", answered: 0, correct: 0, skipped: 1 },
    ]);
  });

  it("reports null accuracy when nothing was answered", () => {
    const summary = summarizeAssessment(
      [{ question_id: "q1", skipped: true }],
      questions,
      [],
    );
    expect(summary.answered).toBe(0);
    expect(summary.accuracy).toBeNull();
  });

  it("ignores responses for unknown questions", () => {
    const summary = summarizeAssessment(
      [{ question_id: "missing", is_correct: true }],
      questions,
      [],
    );
    expect(summary.answered).toBe(0);
    expect(summary.concepts).toEqual([]);
  });
});

describe("questionPublicShape", () => {
  it("returns only fields safe to send to the browser", () => {
    const shape = questionPublicShape({
      id: "q1",
      type: "multiple_choice",
      difficulty: 2,
      prompt: "Pick one",
      options: [{ id: "0", text: "A" }],
      starter_code: "x = 1",
      concept: { slug: "loops", title: "Loops" },
      answer: { optionId: "1" },
      explanation: "Because",
      is_correct: true,
    });

    expect(shape).toEqual({
      id: "q1",
      type: "multiple_choice",
      difficulty: 2,
      prompt: "Pick one",
      options: [{ id: "0", text: "A" }],
      starterCode: "x = 1",
      concept: "loops",
      conceptTitle: "Loops",
    });
    expect(shape).not.toHaveProperty("answer");
    expect(shape).not.toHaveProperty("explanation");
  });

  it("returns null for a missing question", () => {
    expect(questionPublicShape(null)).toBeNull();
  });
});
