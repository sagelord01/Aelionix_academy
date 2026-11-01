/**
 * Single source of truth for turning a scenario into the exact message array
 * the app sends to the model. Shared by the training-data builder and the
 * benchmark prompt builder so train and eval can never drift apart.
 */
import { registerAlias } from "./alias.mjs";

registerAlias();

const { pythonTrack } = await import("@/data/curriculum/python.js");
const { COACH_SYSTEM_PROMPT, PARTNER_SYSTEM_PROMPT } = await import(
  "@/data/prompts/tutor.js"
);
const { buildTutorContext, buildChatMessages } = await import("@/lib/ai/context.js");

export const DEFAULT_PROFILE = {
  experience_level: "beginner",
  hint_preference: "balanced",
  learning_goal: "Build confidence writing small Python programs",
};

export function findLesson(slug) {
  if (!slug) return null;
  return pythonTrack.lessons.find((lesson) => lesson.slug === slug) || null;
}

export function findExercise(lesson, slug) {
  if (!lesson || !slug) return null;
  return (lesson.exercises || []).find((exercise) => exercise.slug === slug) || null;
}

/** Same shape as the `exercises` row returned by loadExercise(). */
export function toExerciseRow(exercise) {
  return {
    title: exercise.title,
    instructions: exercise.instructions,
    expected_behavior: exercise.expectedBehavior,
    hints: exercise.hints || [],
  };
}

/** Same shape as loadLesson() with tutor-service's prerequisites reset. */
export function toLessonRow(lesson) {
  return {
    title: lesson.title,
    objectives: lesson.objectives || [],
    prerequisites: [],
  };
}

/**
 * Render the full request the app would send.
 * Returns { messages, lesson, exercise } so callers can attach metadata.
 */
export function renderMessages({
  mode = "coach",
  profile,
  lesson_slug = null,
  exercise_slug = null,
  mastery = [],
  execution = null,
  code = "",
  question = "",
  history = [],
}) {
  const lesson = findLesson(lesson_slug);
  const exercise = findExercise(lesson, exercise_slug);

  if (lesson_slug && !lesson) throw new Error(`unknown lesson slug: ${lesson_slug}`);
  if (exercise_slug && !exercise) throw new Error(`unknown exercise slug: ${exercise_slug}`);

  const context = buildTutorContext({
    mode,
    profile: profile || DEFAULT_PROFILE,
    lesson: lesson ? toLessonRow(lesson) : null,
    exercise: exercise ? toExerciseRow(exercise) : null,
    mastery,
    execution,
    code,
    question: "",
  });

  const systemPrompt = mode === "partner" ? PARTNER_SYSTEM_PROMPT : COACH_SYSTEM_PROMPT;

  return {
    messages: [
      { role: "system", content: systemPrompt },
      ...buildChatMessages({ context, history, userMessage: question }),
    ],
    lesson,
    exercise,
  };
}

/** Turn a scenario execution spec into the row shape renderExecution() expects. */
export function toExecutionRow(execution, exercise) {
  if (!execution) return null;

  let testResults = execution.test_results;
  if (!testResults && exercise) {
    const failed = new Set(execution.failed || []);
    testResults = (exercise.tests || []).map((test) => ({
      name: test.name,
      hidden: Boolean(test.hidden),
      passed: !failed.has(test.name),
    }));
  }

  return {
    status: execution.status,
    stdout: execution.stdout || "",
    stderr: execution.stderr || "",
    duration_ms: execution.duration_ms ?? 120,
    test_results: testResults || [],
  };
}
