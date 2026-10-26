/**
 * Pure curriculum helpers used by the dashboard and lesson pages.
 */

export function getPrerequisiteStatus(lesson, progressByLessonId) {
  const prerequisites = lesson.prerequisites || lesson.lesson_prerequisites || [];
  const missing = prerequisites.filter((prerequisite) => {
    const id = prerequisite.id || prerequisite.prerequisite_lesson_id;
    return progressByLessonId.get(id)?.status !== "completed";
  });
  return {
    satisfied: missing.length === 0,
    missing,
  };
}

export function getLessonStatus(lesson, progressByLessonId, exercisePasses = new Map()) {
  const progress = progressByLessonId.get(lesson.id);
  if (progress?.status === "completed") return "completed";
  if (progress) return "in_progress";

  const exercises = lesson.exercises || [];
  if (exercises.length > 0 && exercises.every((exercise) => exercisePasses.get(exercise.id))) {
    return "completed";
  }
  return "not_started";
}

export function nextLesson(lessons, progressByLessonId) {
  const ordered = [...lessons].sort((a, b) => a.position - b.position);
  const inProgress = ordered.find(
    (lesson) => progressByLessonId.get(lesson.id)?.status === "in_progress",
  );
  if (inProgress) return inProgress;

  const notStarted = ordered.find(
    (lesson) => progressByLessonId.get(lesson.id)?.status !== "completed",
  );
  return notStarted || ordered[ordered.length - 1] || null;
}

export function lessonProgressPercent(lesson, exerciseProgress = []) {
  const exercises = lesson.exercises || [];
  if (exercises.length === 0) return 0;
  const passed = exercises.filter((exercise) =>
    exerciseProgress.some(
      (item) => item.exercise_id === exercise.id && item.status === "passed",
    ),
  ).length;
  return Math.round((passed / exercises.length) * 100);
}

export function reasonForRecommendation({
  lesson,
  profile,
  progress,
  masteryByConcept,
  assessmentCompleted,
}) {
  if (!assessmentCompleted) {
    return "Your starting-point check has not been completed yet, so the recommendation is provisional.";
  }
  if (progress?.status === "in_progress") {
    return "You already have work in progress here, so continuing is the smallest useful next step.";
  }
  const concepts = lesson.concepts || lesson.lesson_concepts || [];
  const developing = concepts.filter((item) => {
    const status = masteryByConcept.get(item.concept?.slug || item.concept_id)?.status;
    return status === "developing" || status === "insufficient_evidence";
  });
  if (developing.length > 0) {
    return `Your evidence for ${developing
      .map((item) => item.concept?.title || "this concept")
      .join(" and ")} is still developing. This lesson targets it directly.`;
  }
  if (profile?.experience_level === "beginner") {
    return "This is the earliest lesson whose prerequisites are complete and whose exercises you have not passed yet.";
  }
  return "This is the next lesson with unfinished practical evidence in your current path.";
}

export function completedLessonIds(progressList = []) {
  return new Set(
    progressList.filter((item) => item.status === "completed").map((item) => item.lesson_id),
  );
}
