import { describe, expect, it } from "vitest";
import {
  completedLessonIds,
  getLessonStatus,
  getPrerequisiteStatus,
  lessonProgressPercent,
  nextLesson,
  reasonForRecommendation,
} from "@/lib/learning/curriculum";

const lesson = {
  id: "lesson-a",
  slug: "lesson-a",
  position: 2,
  concepts: [
    { concept: { slug: "loops", title: "Loops" } },
    { concept: { slug: "lists", title: "Lists" } },
  ],
  exercises: [{ id: "ex-1" }, { id: "ex-2" }],
  prerequisites: [{ id: "lesson-b", title: "Prerequisites" }],
};

describe("getPrerequisiteStatus", () => {
  it("lists prerequisites that are not complete", () => {
    const status = getPrerequisiteStatus(lesson, new Map());
    expect(status.satisfied).toBe(false);
    expect(status.missing).toHaveLength(1);
  });

  it("is satisfied when every prerequisite is completed", () => {
    const status = getPrerequisiteStatus(
      lesson,
      new Map([["lesson-b", { status: "completed" }]]),
    );
    expect(status.satisfied).toBe(true);
    expect(status.missing).toHaveLength(0);
  });

  it("understands the database join shape", () => {
    const databaseLesson = {
      ...lesson,
      prerequisites: undefined,
      lesson_prerequisites: [{ prerequisite_lesson_id: "lesson-b" }],
    };
    const status = getPrerequisiteStatus(
      databaseLesson,
      new Map([["lesson-b", { status: "completed" }]]),
    );
    expect(status.satisfied).toBe(true);
  });
});

describe("getLessonStatus", () => {
  it("trusts persisted completion", () => {
    expect(
      getLessonStatus(lesson, new Map([[lesson.id, { status: "completed" }]])),
    ).toBe("completed");
  });

  it("reports progress rows as in progress", () => {
    expect(
      getLessonStatus(lesson, new Map([[lesson.id, { status: "in_progress" }]])),
    ).toBe("in_progress");
  });

  it("does not infer completion from a partial pass", () => {
    expect(getLessonStatus(lesson, new Map(), new Map([["ex-1", true]]))).toBe(
      "not_started",
    );
  });

  it("infers completion when every exercise has a passing mark", () => {
    expect(
      getLessonStatus(
        lesson,
        new Map(),
        new Map([
          ["ex-1", true],
          ["ex-2", true],
        ]),
      ),
    ).toBe("completed");
  });
});

describe("lessonProgressPercent", () => {
  it("uses passed exercises only", () => {
    expect(
      lessonProgressPercent(lesson, [
        { exercise_id: "ex-1", status: "passed" },
        { exercise_id: "ex-2", status: "attempted" },
      ]),
    ).toBe(50);
  });

  it("returns zero for a lesson without exercises", () => {
    expect(lessonProgressPercent({ exercises: [] }, [])).toBe(0);
  });
});

describe("nextLesson", () => {
  const second = { ...lesson, id: "second", position: 2 };
  const first = { ...lesson, id: "first", position: 1 };

  it("continues an in-progress lesson first", () => {
    const result = nextLesson(
      [second, first],
      new Map([["second", { status: "in_progress" }]]),
    );
    expect(result.id).toBe("second");
  });

  it("returns the earliest unfinished lesson", () => {
    const result = nextLesson(
      [second, first],
      new Map([["first", { status: "completed" }]]),
    );
    expect(result.id).toBe("second");
  });
});

describe("reasonForRecommendation", () => {
  const masteryByConcept = new Map([
    ["loops", { status: "developing" }],
    ["lists", { status: "ready_for_challenge" }],
  ]);

  it("marks recommendations provisional before the check", () => {
    expect(
      reasonForRecommendation({
        lesson,
        profile: {},
        masteryByConcept,
        assessmentCompleted: false,
      }),
    ).toContain("provisional");
  });

  it("explains continuation of work in progress", () => {
    expect(
      reasonForRecommendation({
        lesson,
        profile: {},
        progress: { status: "in_progress" },
        masteryByConcept,
        assessmentCompleted: true,
      }),
    ).toContain("work in progress");
  });

  it("cites concepts with thin evidence", () => {
    const reason = reasonForRecommendation({
      lesson,
      profile: {},
      masteryByConcept,
      assessmentCompleted: true,
    });
    expect(reason).toContain("Loops");
    expect(reason).not.toContain("Lists");
  });

  it("falls back to the next unfinished lesson for beginners", () => {
    expect(
      reasonForRecommendation({
        lesson,
        profile: { experience_level: "beginner" },
        masteryByConcept: new Map(),
        assessmentCompleted: true,
      }),
    ).toContain("earliest lesson");
  });
});

describe("completedLessonIds", () => {
  it("returns only completed ids", () => {
    const ids = completedLessonIds([
      { lesson_id: "a", status: "completed" },
      { lesson_id: "b", status: "in_progress" },
    ]);
    expect([...ids]).toEqual(["a"]);
  });
});
