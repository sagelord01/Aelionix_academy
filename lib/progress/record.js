import "server-only";
import { applyEvidence, deriveMasteryStatus } from "@/lib/progress/mastery";
import { scheduleReview } from "@/lib/review/schedule";

export class ProgressError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function addConceptEvidence(
  admin,
  userId,
  entries,
) {
  if (!entries.length) return [];

  const conceptIds = [...new Set(entries.map((entry) => entry.conceptId).filter(Boolean))];
  if (!conceptIds.length) return [];

  const { data: existing, error } = await admin
    .from("concept_mastery")
    .select("concept_id, evidence_count, correct_count, practical_successes")
    .eq("user_id", userId)
    .in("concept_id", conceptIds);

  if (error) throw new ProgressError("mastery_read_failed", error.message);

  const existingByConcept = new Map(
    (existing || []).map((item) => [item.concept_id, item]),
  );
  const aggregate = new Map();

  for (const entry of entries) {
    if (!entry.conceptId) continue;
    const current = aggregate.get(entry.conceptId) || {
      concept_id: entry.conceptId,
      evidence_count: existingByConcept.get(entry.conceptId)?.evidence_count || 0,
      correct_count: existingByConcept.get(entry.conceptId)?.correct_count || 0,
      practical_successes:
        existingByConcept.get(entry.conceptId)?.practical_successes || 0,
    };
    const next = applyEvidence(current, {
      correct: Boolean(entry.correct),
      practical: Boolean(entry.practical),
    });
    aggregate.set(entry.conceptId, {
      user_id: userId,
      concept_id: entry.conceptId,
      evidence_count: next.evidenceCount,
      correct_count: next.correctCount,
      practical_successes: next.practicalSuccesses,
      status: next.status,
      last_evidence_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const rows = [...aggregate.values()];
  const { data, error: upsertError } = await admin
    .from("concept_mastery")
    .upsert(rows, { onConflict: "user_id,concept_id" })
    .select();

  if (upsertError) {
    throw new ProgressError("mastery_write_failed", upsertError.message);
  }
  return data || [];
}

export async function scheduleReviewCards({
  admin,
  userId,
  lessonId,
  concepts,
  now = new Date(),
}) {
  const conceptIds = [...new Set((concepts || []).map((concept) => concept.id).filter(Boolean))];
  if (!conceptIds.length) return [];

  const { data: cards, error } = await admin
    .from("review_cards")
    .select("id, concept_id")
    .in("concept_id", conceptIds)
    .eq("is_published", true)
    .order("created_at");

  if (error) throw new ProgressError("review_card_read_failed", error.message);

  const cardByConcept = new Map();
  for (const card of cards || []) {
    if (!cardByConcept.has(card.concept_id)) {
      cardByConcept.set(card.concept_id, card);
    }
  }

  const rows = (concepts || [])
    .map((concept) => {
      const card = cardByConcept.get(concept.id);
      if (!card) return null;
      return {
        user_id: userId,
        card_id: card.id,
        concept_id: concept.id,
        lesson_id: lessonId,
        due_at: now.toISOString(),
        interval_days: 1,
        repetitions: 0,
        ease: 2.5,
        lapses: 0,
      };
    })
    .filter(Boolean);

  if (!rows.length) return [];

  const { data: inserted, error: insertError } = await admin
    .from("review_items")
    .upsert(rows, { onConflict: "user_id,card_id", ignoreDuplicates: true })
    .select("id, card_id");

  if (insertError) {
    throw new ProgressError("review_schedule_failed", insertError.message);
  }
  return inserted || [];
}

export async function recordLearningEvent(
  admin,
  { userId, kind, lessonId = null, exerciseId = null, metadata = {} },
) {
  const { error } = await admin.from("learning_events").insert({
    user_id: userId,
    kind,
    lesson_id: lessonId,
    exercise_id: exerciseId,
    metadata,
  });
  if (error) {
    // Events are useful but must not destroy a successful learning operation.
    console.error("Learning event insert failed:", error.message);
  }
}

export async function markLessonStarted({ admin, userId, lessonId }) {
  const { data: existing, error } = await admin
    .from("lesson_progress")
    .select("lesson_id, status")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw new ProgressError("lesson_progress_read_failed", error.message);

  if (!existing) {
    const { error: insertError } = await admin.from("lesson_progress").insert({
      user_id: userId,
      lesson_id: lessonId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    });
    if (insertError) {
      throw new ProgressError("lesson_progress_write_failed", insertError.message);
    }
    await recordLearningEvent(admin, {
      userId,
      kind: "lesson_started",
      lessonId,
    });
  } else {
    await admin
      .from("lesson_progress")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("lesson_id", lessonId);
  }

  return { started: true };
}

export async function recordExerciseAttempt({
  admin,
  userId,
  lessonId,
  exerciseId,
  attemptKind,
  code,
  language = "python",
  result,
}) {
  const isSuccess = result.status === "success";
  const { data, error } = await admin
    .from("code_attempts")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      exercise_id: exerciseId,
      attempt_kind: attemptKind,
      code,
      language,
      execution_status: result.status,
      stdout: (result.stdout || "").slice(0, 20000),
      stderr: (result.stderr || "").slice(0, 20000),
      exit_code: result.exitCode ?? null,
      duration_ms: result.durationMs ?? null,
      test_results: result.tests || [],
      provider: result.provider || "judge0",
      provider_submission_id: result.providerSubmissionId || null,
      is_successful: isSuccess,
    })
    .select("id, created_at")
    .single();

  if (error) {
    throw new ProgressError("attempt_write_failed", error.message);
  }
  return data;
}

export async function markExerciseResult({
  admin,
  userId,
  lesson,
  exercise,
  passed,
  testResults,
}) {
  const { data: current } = await admin
    .from("exercise_progress")
    .select("status, attempts")
    .eq("user_id", userId)
    .eq("exercise_id", exercise.id)
    .maybeSingle();

  const attempts = (current?.attempts || 0) + 1;
  const alreadyPassed = current?.status === "passed";

  const { error } = await admin.from("exercise_progress").upsert(
    {
      user_id: userId,
      exercise_id: exercise.id,
      status: alreadyPassed || passed ? "passed" : "attempted",
      attempts,
      passed_at: alreadyPassed
        ? undefined
        : passed
          ? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exercise_id" },
  );

  if (error) throw new ProgressError("exercise_progress_write_failed", error.message);

  if (passed && !alreadyPassed) {
    await addConceptEvidence(
      admin,
      userId,
      (lesson.concepts || []).map((concept) => ({
        conceptId: concept.id,
        correct: true,
        practical: true,
      })),
    );
    await recordLearningEvent(admin, {
      userId,
      kind: "exercise_passed",
      lessonId: lesson.id,
      exerciseId: exercise.id,
      metadata: {
        testsPassed: (testResults || []).filter((test) => test.passed).length,
      },
    });
    await scheduleReviewCards({
      admin,
      userId,
      lessonId: lesson.id,
      concepts: lesson.concepts || [],
    });
  }

  // A lesson is complete only when every published exercise has a persisted
  // passing attempt. Completion is never accepted from the client.
  const { data: allExercises } = await admin
    .from("exercises")
    .select("id")
    .eq("lesson_id", lesson.id)
    .eq("is_published", true);

  const { data: passedRows } = await admin
    .from("exercise_progress")
    .select("exercise_id")
    .eq("user_id", userId)
    .eq("status", "passed")
    .in("exercise_id", (allExercises || []).map((item) => item.id));

  const allPassed =
    (allExercises || []).length > 0 &&
    (passedRows || []).length >= (allExercises || []).length;

  let lessonCompleted = false;
  if (allPassed) {
    const { data: progress } = await admin
      .from("lesson_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    if (progress?.status !== "completed") {
      const { error: lessonError } = await admin.from("lesson_progress").upsert(
        {
          user_id: userId,
          lesson_id: lesson.id,
          status: "completed",
          started_at: progress ? undefined : new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );
      if (lessonError) {
        throw new ProgressError("lesson_progress_write_failed", lessonError.message);
      }
      lessonCompleted = true;
      await recordLearningEvent(admin, {
        userId,
        kind: "lesson_completed",
        lessonId: lesson.id,
      });
      await scheduleReviewCards({
        admin,
        userId,
        lessonId: lesson.id,
        concepts: lesson.concepts || [],
      });
    }
  }

  return {
    passed,
    alreadyPassed,
    lessonCompleted,
    attempts,
    allExercisesPassed: allPassed,
  };
}

export function buildConceptStatus({ evidenceCount, correctCount, practicalSuccesses }) {
  return deriveMasteryStatus({ evidenceCount, correctCount, practicalSuccesses });
}

export function nextSchedule(item, quality, now = new Date()) {
  return scheduleReview(
    {
      intervalDays: item.interval_days,
      repetitions: item.repetitions,
      ease: Number(item.ease),
      lapses: item.lapses,
    },
    quality,
    now,
  );
}
