import { notFound } from "next/navigation";
import LessonWorkspace from "@/components/workspace/LessonWorkspace";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getAiConfig, getExecutionConfig } from "@/lib/config/env";
import {
  getLessonForWorkspace,
  getLessonProgress,
} from "@/lib/data/curriculum";
import { getLessonProgressList } from "@/lib/data/progress";
import { getLatestLessonConversation } from "@/lib/data/tutor";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Lesson workspace" };

function pickInitialExercise(exercises, exerciseParam, exerciseProgress) {
  if (exerciseParam) {
    const match = exercises.find(
      (exercise) =>
        exercise.slug === exerciseParam || exercise.id === exerciseParam,
    );
    if (match) return match.id;
  }
  const unfinished = exercises.find(
    (exercise) => exerciseProgress[exercise.id]?.status !== "passed",
  );
  return (unfinished || exercises[0])?.id || null;
}

export default async function LessonPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const { supabase, user, profile } = await requireOnboardedUser();

  const data = await getLessonForWorkspace(supabase, slug);
  if (!data?.lesson) notFound();

  const { lesson, siblings } = data;
  const [progress, allLessonProgress, coach, partner] = await Promise.all([
    getLessonProgress(supabase, user.id, lesson.id),
    getLessonProgressList(supabase, user.id),
    getLatestLessonConversation(supabase, user.id, lesson.id, "coach"),
    getLatestLessonConversation(supabase, user.id, lesson.id, "partner"),
  ]);

  const exerciseProgress = Object.fromEntries(
    progress.exerciseProgress.map((item) => [item.exercise_id, item]),
  );
  const drafts = Object.fromEntries(
    progress.drafts.map((draft) => [draft.exercise_id, draft.code]),
  );

  const attemptsByExercise = {};
  for (const attempt of progress.attempts) {
    if (!attempt.exercise_id || attemptsByExercise[attempt.exercise_id]) {
      continue;
    }
    attemptsByExercise[attempt.exercise_id] = attempt;
  }

  const progressByLesson = new Map(
    allLessonProgress.map((item) => [item.lesson_id, item]),
  );

  const allPassed =
    lesson.exercises.length > 0 &&
    lesson.exercises.every(
      (exercise) => exerciseProgress[exercise.id]?.status === "passed",
    );

  const lessonProgress =
    progress.lessonProgress ||
    (allPassed
      ? { status: "completed" }
      : Object.keys(exerciseProgress).length
        ? { status: "in_progress" }
        : null);

  const prerequisites = {
    missing: lesson.prerequisites.filter(
      (item) => progressByLesson.get(item.id)?.status !== "completed",
    ),
  };

  const initialExerciseId = pickInitialExercise(
    lesson.exercises,
    typeof query?.exercise === "string" ? query.exercise : null,
    exerciseProgress,
  );

  const credentialed = Boolean(getSupabaseAdmin());
  const execution = getExecutionConfig();
  const ai = getAiConfig();

  return (
    <LessonWorkspace
      key={`${lesson.id}:${initialExerciseId || "none"}`}
      lesson={lesson}
      siblings={siblings}
      initialExerciseId={initialExerciseId}
      lessonProgress={lessonProgress}
      exerciseProgress={exerciseProgress}
      drafts={drafts}
      lastAttempts={attemptsByExercise}
      prerequisites={prerequisites}
      tutor={{ coach, partner }}
      preferredMode={profile.preferred_mode}
      executionAvailable={execution.configured && credentialed}
      aiConfigured={ai.configured}
      progressPersistence={credentialed}
      canRunPlayground={credentialed}
    />
  );
}
