import "server-only";
import { ExecutionError, executePython } from "@/lib/execution/judge0";
import { markExerciseResult, recordExerciseAttempt } from "@/lib/progress/record";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export class CodeRunError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "CodeRunError";
    this.code = code;
    this.status = status;
  }
}

export async function loadExerciseContext(admin, exerciseId) {
  const { data, error } = await admin
    .from("exercises")
    .select(
      `id, lesson_id, title, instructions, expected_behavior, is_published,
       lesson:lessons(id, slug, title, is_published)`,
    )
    .eq("id", exerciseId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new CodeRunError(
      "exercise_read_failed",
      "The exercise could not be loaded.",
      500,
    );
  }
  if (!data || !data.lesson?.is_published) {
    throw new CodeRunError("exercise_not_found", "Exercise not found.", 404);
  }

  const [{ data: tests, error: testError }, { data: mappedConcepts, error: conceptError }] =
    await Promise.all([
      admin
        .from("exercise_tests")
        .select("id, name, code, is_hidden, position")
        .eq("exercise_id", exerciseId)
        .order("position"),
      admin
        .from("exercise_concepts")
        .select("position, concept:concepts(id, slug, title)")
        .eq("exercise_id", exerciseId)
        .order("position"),
    ]);

  if (testError) {
    throw new CodeRunError(
      "tests_read_failed",
      "The exercise checks could not be loaded.",
      500,
    );
  }
  if (conceptError) {
    throw new CodeRunError(
      "exercise_concepts_read_failed",
      "The exercise concept mapping could not be loaded.",
      500,
    );
  }

  const concepts = (mappedConcepts || [])
    .map((item) => item.concept)
    .filter(Boolean);

  return {
    exercise: { ...data, concepts },
    lesson: data.lesson,
    tests: (tests || []).map((test) => ({
      name: test.name,
      code: test.code,
      hidden: Boolean(test.is_hidden),
    })),
  };
}

function publicResult(result) {
  const tests = Array.isArray(result.tests)
    ? result.tests.map((test) => ({
        name: test.hidden ? test.name : String(test.name || "Check"),
        passed: Boolean(test.passed),
        hidden: Boolean(test.hidden),
        detail: test.hidden ? "" : String(test.detail || "").slice(0, 400),
      }))
    : null;

  return {
    status: result.status,
    stdout: String(result.stdout || "").slice(0, 20000),
    stderr: String(result.stderr || "").slice(0, 12000),
    exitCode: result.exitCode ?? null,
    durationMs: result.durationMs ?? null,
    providerStatus: result.rawDescription || "",
    tests,
    allTestsPassed:
      tests && tests.length > 0 ? tests.every((test) => test.passed) : null,
  };
}

export async function runLearnerCode({ admin, userId, input }) {
  const rate = await enforceRateLimit({ admin, userId, kind: "execution" });
  if (!rate.allowed) {
    throw new CodeRunError("rate_limited", rate.message, 429);
  }

  let exerciseContext = null;
  if (input.exerciseId) {
    if (!admin) {
      throw new CodeRunError(
        "setup_required",
        "Exercise checks need SUPABASE_SERVICE_ROLE_KEY on the server. Nothing was run or saved.",
        503,
      );
    }
    exerciseContext = await loadExerciseContext(admin, input.exerciseId);
    if (!exerciseContext.tests.length) {
      throw new CodeRunError(
        "exercise_has_no_tests",
        "This exercise has no checks configured, so it cannot be submitted. Run your code without submitting instead.",
        503,
      );
    }
  }

  if (input.mode === "submit" && !exerciseContext) {
    throw new CodeRunError(
      "exercise_required",
      "Choose an exercise before submitting. The playground can only run code.",
      400,
    );
  }

  let result;
  try {
    result = await executePython({
      code: input.code,
      tests: exerciseContext?.tests || [],
    });
  } catch (error) {
    if (error instanceof ExecutionError) {
      throw new CodeRunError(error.code, error.message, error.status);
    }
    throw error;
  }

  const sanitized = publicResult(result);
  let persisted = false;
  let warning = "";
  let progress = null;

  if (exerciseContext && admin) {
    try {
      await recordExerciseAttempt({
        admin,
        userId,
        lessonId: exerciseContext.lesson.id,
        exerciseId: exerciseContext.exercise.id,
        attemptKind: input.mode === "submit" ? "submit" : "run",
        code: input.code,
        result: {
          ...result,
          tests: sanitized.tests,
        },
      });

      await admin.from("exercise_drafts").upsert(
        {
          user_id: userId,
          exercise_id: exerciseContext.exercise.id,
          code: input.code,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,exercise_id" },
      );

      persisted = true;

      if (input.mode === "submit") {
        const passed = sanitized.allTestsPassed === true;
        progress = await markExerciseResult({
          admin,
          userId,
          lesson: exerciseContext.lesson,
          exercise: exerciseContext.exercise,
          passed,
          testResults: sanitized.tests || [],
        });
        if (
          progress.conceptMapping === "unmapped" &&
          progress.passed &&
          !progress.alreadyPassed
        ) {
          warning =
            "Your code passed, but this exercise has no concept mapping. No mastery evidence was recorded.";
        }
      }
    } catch (error) {
      // The code really ran. Tell the truth: show the output, but state that
      // the attempt was not saved and progress was not changed.
      console.error("Attempt persistence failed:", error?.message || "unknown");
      persisted = false;
      warning =
        "Your code ran, but the attempt could not be saved. Progress was not changed.";
    }
  } else if (!exerciseContext) {
    warning = admin
      ? ""
      : "Playground runs are not persisted because the server is missing SUPABASE_SERVICE_ROLE_KEY.";
  }

  return {
    result: sanitized,
    exercise: exerciseContext
      ? {
          id: exerciseContext.exercise.id,
          lessonId: exerciseContext.lesson.id,
          lessonSlug: exerciseContext.lesson.slug,
          title: exerciseContext.exercise.title,
        }
      : null,
    persisted,
    warning,
    progress,
    rateLimitRemaining: rate.remaining ?? null,
  };
}
