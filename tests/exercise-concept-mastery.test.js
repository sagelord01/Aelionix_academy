import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { markExerciseResult } from "@/lib/progress/record";

function concept(id, slug) {
  return { id, slug, title: slug };
}

function createAdmin() {
  const calls = [];
  const state = {
    exerciseProgressByUserExercise: new Map(),
    lessonProgressByUserLesson: new Map(),
    mastery: [],
    reviewItems: [],
    learningEvents: [],
  };

  const admin = {
    from(table) {
      const query = {
        table,
        op: "select",
        payload: null,
        options: null,
        filters: [],
        columns: null,
        eq(col, value) {
          this.filters.push({ type: "eq", col, value });
          return this;
        },
        in(col, value) {
          this.filters.push({ type: "in", col, value });
          return this;
        },
        order() {
          return this;
        },
        select(columns) {
          this.columns = columns;
          if (this.op === "upsert") {
            // upsert().select() expects result
            this._wantsSelect = true;
          } else {
            this.op = "select";
          }
          return this;
        },
        maybeSingle() {
          this.kind = "maybeSingle";
          return this;
        },
        single() {
          this.kind = "single";
          return this;
        },
        upsert(payload, options) {
          this.op = "upsert";
          this.payload = payload;
          this.options = options || {};
          return this;
        },
        insert(payload) {
          this.op = "insert";
          this.payload = payload;
          return this;
        },
        then(resolve, reject) {
          return this.execute().then(resolve, reject);
        },
        async execute() {
          calls.push({
            table,
            op: this.op,
            payload: this.payload,
            options: this.options,
            filters: [...this.filters],
            columns: this.columns,
            kind: this.kind,
          });

          if (this.op === "upsert") {
            if (table === "exercise_progress") {
              const row = Array.isArray(this.payload) ? this.payload[0] : this.payload;
              state.exerciseProgressByUserExercise.set(
                `${row.user_id}:${row.exercise_id}`,
                row,
              );
              if (this._wantsSelect) return { data: row, error: null };
              return { error: null };
            }
            if (table === "lesson_progress") {
              const row = Array.isArray(this.payload) ? this.payload[0] : this.payload;
              state.lessonProgressByUserLesson.set(
                `${row.user_id}:${row.lesson_id}`,
                row,
              );
              if (this._wantsSelect) return { data: row, error: null };
              return { error: null };
            }
            if (table === "concept_mastery") {
              const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
              for (const row of rows) state.mastery.push(row);
              return { data: rows, error: null };
            }
            if (table === "review_items") {
              const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
              if (this.options.ignoreDuplicates) {
                for (const row of rows) {
                  if (!state.reviewItems.find((r) => r.user_id === row.user_id && r.card_id === row.card_id)) {
                    state.reviewItems.push(row);
                  }
                }
              } else {
                state.reviewItems.push(...rows);
              }
              const inserted = (Array.isArray(this.payload) ? this.payload : [this.payload])
                .filter((row) => state.reviewItems.find((r) => r.user_id === row.user_id && r.card_id === row.card_id))
                .map((row, i) => ({ id: `ri-${i}`, card_id: row.card_id }));
              return { data: inserted, error: null };
            }
            return { error: null };
          }

          if (this.op === "insert") {
            if (table === "learning_events") {
              state.learningEvents.push(this.payload);
              return { error: null };
            }
            return { error: null };
          }

          if (this.op === "select") {
            if (table === "exercise_progress" && this.kind === "maybeSingle") {
              const userId = this.filters.find((f) => f.col === "user_id")?.value;
              const exerciseId = this.filters.find((f) => f.col === "exercise_id")?.value;
              return { data: state.exerciseProgressByUserExercise.get(`${userId}:${exerciseId}`) || null, error: null };
            }
            if (table === "exercise_progress") {
              const exerciseIds = this.filters.find((f) => f.col === "exercise_id" && f.type === "in")?.value || [];
              const data = exerciseIds
                .map((id) => state.exerciseProgressByUserExercise.get(`u:1:${id}`) || state.exerciseProgressByUserExercise.get(`u:${id}`) || [...state.exerciseProgressByUserExercise.entries()].find(([k]) => k.endsWith(`:${id}`))?.[1])
                .filter((row) => row?.status === "passed");
              return { data, error: null };
            }
            if (table === "lesson_progress" && this.kind === "maybeSingle") {
              const userId = this.filters.find((f) => f.col === "user_id")?.value;
              const lessonId = this.filters.find((f) => f.col === "lesson_id")?.value;
              return { data: state.lessonProgressByUserLesson.get(`${userId}:${lessonId}`) || null, error: null };
            }
            if (table === "concept_mastery") {
              return { data: state.mastery, error: null };
            }
            if (table === "review_cards") {
              const ids = this.filters.find((f) => f.col === "concept_id" && f.type === "in")?.value || [];
              const data = ids.map((id) => ({ id: `card-${id}`, concept_id: id }));
              return { data, error: null };
            }
            if (table === "exercises") {
              const lessonId = this.filters.find((f) => f.col === "lesson_id")?.value;
              const items = (admin._allExercises || []).filter((ex) => ex.lesson_id === lessonId);
              return { data: items, error: null };
            }
            return { data: [], error: null };
          }

          return { data: null, error: null };
        },
      };
      return query;
    },
    _calls: calls,
    _state: state,
  };
  return admin;
}

describe("exercise concepts mastery", () => {
  it("credits only mapped concepts on pass and schedules review for them", async () => {
    const loops = concept("c-loops", "loops");
    const lists = concept("c-lists", "lists");
    const admin = createAdmin();
    admin._allExercises = [
      {
        id: "ex-1",
        lesson_id: "l-1",
        exercise_concepts: [{ concept: loops }],
      },
    ];
    const lesson = { id: "l-1", concepts: [loops, lists] };
    const exercise = { id: "ex-1", concepts: [loops] };

    const result = await markExerciseResult({
      admin,
      userId: "u-1",
      lesson,
      exercise,
      passed: true,
      testResults: [{ passed: true }],
    });

    expect(result.conceptMapping).toBe("mapped");
    expect(result.conceptsCredited).toEqual(["loops"]);
    const masteryCalls = admin._calls.filter((c) => c.table === "concept_mastery" && c.op === "upsert");
    expect(masteryCalls.length).toBe(1);
    expect(masteryCalls[0].payload[0].concept_id).toBe("c-loops");
    const reviewCalls = admin._calls.filter((c) => c.table === "review_items" && c.op === "upsert");
    expect(reviewCalls.length).toBeGreaterThanOrEqual(1);
    for (const call of reviewCalls) {
      for (const row of call.payload) {
        expect(row.concept_id).toBe("c-loops");
      }
    }
    expect(admin._calls.some((c) => c.table === "learning_events" && c.payload?.metadata?.conceptMapping === "mapped")).toBe(true);
  });

  it("excludes unrelated lesson concepts", async () => {
    const loops = concept("c-loops", "loops");
    const lists = concept("c-lists", "lists");
    const admin = createAdmin();
    admin._allExercises = [
      { id: "ex-1", lesson_id: "l-1", exercise_concepts: [{ concept: loops }] },
    ];
    const result = await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-1", concepts: [loops] },
      passed: true,
      testResults: [{ passed: true }],
    });
    const mastery = admin._calls.find((c) => c.table === "concept_mastery" && c.op === "upsert");
    expect(mastery.payload.map((r) => r.concept_id)).toEqual(["c-loops"]);
    expect(mastery.payload.map((r) => r.concept_id)).not.toContain(lists.id);
    void result;
  });

  it("credits only mapped concepts for multi-concept exercises", async () => {
    const functions = concept("c-func", "functions");
    const exceptions = concept("c-exc", "exceptions");
    const classes = concept("c-cls", "classes");
    const admin = createAdmin();
    admin._allExercises = [
      { id: "ex-1", lesson_id: "l-1", exercise_concepts: [{ concept: functions }, { concept: exceptions }] },
    ];
    await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-1", concepts: [functions, exceptions] },
      passed: true,
      testResults: [{ passed: true }],
    });
    const mastery = admin._calls.find((c) => c.table === "concept_mastery" && c.op === "upsert");
    expect(mastery.payload.map((r) => r.concept_id).sort()).toEqual(["c-exc", "c-func"]);
    expect(mastery.payload.map((r) => r.concept_id)).not.toContain(classes.id);
  });

  it("does not grant mastery on failure", async () => {
    const loops = concept("c-loops", "loops");
    const admin = createAdmin();
    admin._allExercises = [
      { id: "ex-1", lesson_id: "l-1", exercise_concepts: [{ concept: loops }] },
    ];
    const result = await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-1", concepts: [loops] },
      passed: false,
      testResults: [{ passed: false }],
    });
    expect(admin._calls.find((c) => c.table === "concept_mastery")).toBeUndefined();
    expect(admin._calls.find((c) => c.table === "review_items")).toBeUndefined();
    expect(result.passed).toBe(false);
  });

  it("produces a safe outcome for unmapped exercises with no mastery or review", async () => {
    const admin = createAdmin();
    admin._allExercises = [
      { id: "ex-1", lesson_id: "l-1", exercise_concepts: [] },
    ];
    const result = await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-1", concepts: [] },
      passed: true,
      testResults: [{ passed: true }],
    });
    expect(result.conceptMapping).toBe("unmapped");
    expect(result.conceptsCredited).toEqual([]);
    expect(admin._calls.find((c) => c.table === "concept_mastery")).toBeUndefined();
    expect(admin._calls.find((c) => c.table === "review_items")).toBeUndefined();
    expect(admin._calls.some((c) => c.table === "learning_events" && c.payload?.kind === "exercise_passed")).toBe(true);
    expect(admin._calls.find((c) => c.table === "learning_events" && c.payload?.kind === "exercise_passed").payload.metadata.conceptMapping).toBe("unmapped");
  });

  it("does not duplicate evidence or side effects on retry after passing", async () => {
    const loops = concept("c-loops", "loops");
    const admin = createAdmin();
    admin._allExercises = [
      { id: "ex-1", lesson_id: "l-1", exercise_concepts: [{ concept: loops }] },
    ];
    const first = await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-1", concepts: [loops] },
      passed: true,
      testResults: [{ passed: true }],
    });
    expect(first.alreadyPassed).toBe(false);
    const second = await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-1", concepts: [loops] },
      passed: true,
      testResults: [{ passed: true }],
    });
    expect(second.alreadyPassed).toBe(true);
    expect(second.conceptsCredited).toEqual([]);
    const masteryCalls = admin._calls.filter((c) => c.table === "concept_mastery" && c.op === "upsert");
    expect(masteryCalls.length).toBe(1);
    const exercisePassedEvents = admin._calls.filter((c) => c.table === "learning_events" && c.payload?.kind === "exercise_passed");
    expect(exercisePassedEvents.length).toBe(1);
  });

  it("uses union of mapped exercise concepts for lesson completion review scheduling", async () => {
    const loops = concept("c-loops", "loops");
    const lists = concept("c-lists", "lists");
    const admin = createAdmin();
    admin._allExercises = [
      { id: "ex-1", lesson_id: "l-1", exercise_concepts: [{ concept: loops }] },
      { id: "ex-2", lesson_id: "l-1", exercise_concepts: [{ concept: lists }] },
    ];
    const progress = admin._state.exerciseProgressByUserExercise;
    // ex-1 already passed
    progress.set("u-1:ex-1", { user_id: "u-1", exercise_id: "ex-1", status: "passed", attempts: 1 });
    await markExerciseResult({
      admin,
      userId: "u-1",
      lesson: { id: "l-1" },
      exercise: { id: "ex-2", concepts: [lists] },
      passed: true,
      testResults: [{ passed: true }],
    });
    const reviewCalls = admin._calls.filter((c) => c.table === "review_items" && c.op === "upsert");
    const conceptsReviewed = new Set();
    for (const call of reviewCalls) for (const row of call.payload) conceptsReviewed.add(row.concept_id);
    expect(conceptsReviewed.has("c-loops")).toBe(true);
    expect(conceptsReviewed.has("c-lists")).toBe(true);
  });
});
