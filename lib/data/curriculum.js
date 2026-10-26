import "server-only";

export async function getPublishedTrack(supabase, slug = null) {
  let query = supabase
    .from("learning_tracks")
    .select("id, slug, title, description, language, position")
    .eq("is_published", true);

  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query.order("position").limit(1).maybeSingle();
  if (error) throw new Error(`Unable to load learning track: ${error.message}`);
  return data;
}

export async function getCurriculumOverview(supabase) {
  const track = await getPublishedTrack(supabase);
  if (!track) return { track: null, lessons: [] };

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select(
      `id, slug, title, description, difficulty, estimated_minutes, position, objectives,
       lesson_concepts(concept:concepts(id, slug, title, description)),
       lesson_prerequisites!lesson_prerequisites_lesson_id_fkey(prerequisite_lesson_id)`,
    )
    .eq("track_id", track.id)
    .eq("is_published", true)
    .order("position");

  if (error) throw new Error(`Unable to load lessons: ${error.message}`);

  const { data: exercises, error: exerciseError } = await supabase
    .from("exercises")
    .select("id, lesson_id, slug, title, difficulty, position")
    .in("lesson_id", (lessons || []).map((lesson) => lesson.id))
    .eq("is_published", true)
    .order("position");

  if (exerciseError) {
    throw new Error(`Unable to load exercises: ${exerciseError.message}`);
  }

  const exercisesByLesson = new Map();
  for (const exercise of exercises || []) {
    const list = exercisesByLesson.get(exercise.lesson_id) || [];
    list.push(exercise);
    exercisesByLesson.set(exercise.lesson_id, list);
  }

  return {
    track,
    lessons: (lessons || []).map((lesson) => ({
      ...lesson,
      concepts: (lesson.lesson_concepts || []).map((item) => item.concept).filter(Boolean),
      prerequisites: lesson.lesson_prerequisites || [],
      exercises: exercisesByLesson.get(lesson.id) || [],
    })),
  };
}

export async function getLessonForWorkspace(supabase, slug) {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(
      `id, track_id, slug, title, description, difficulty, estimated_minutes,
       objectives, content, position,
       track:learning_tracks(id, slug, title, description, language),
       lesson_concepts(concept:concepts(id, slug, title, description)),
       lesson_prerequisites!lesson_prerequisites_lesson_id_fkey(prerequisite_lesson_id)`,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error(`Unable to load lesson: ${error.message}`);
  if (!lesson) return null;

  // Fetch prerequisite titles from the public lesson list.
  const prerequisites = [];
  if (lesson.lesson_prerequisites?.length) {
    const ids = lesson.lesson_prerequisites.map((item) => item.prerequisite_lesson_id);
    const { data: prerequisiteLessons } = await supabase
      .from("lessons")
      .select("id, slug, title, position")
      .in("id", ids);
    prerequisites.push(...(prerequisiteLessons || []));
  }

  const { data: exercises, error: exerciseError } = await supabase
    .from("exercises")
    .select(
      "id, lesson_id, slug, title, instructions, expected_behavior, starter_code, language, difficulty, position, hints",
    )
    .eq("lesson_id", lesson.id)
    .eq("is_published", true)
    .order("position");

  if (exerciseError) {
    throw new Error(`Unable to load exercises: ${exerciseError.message}`);
  }

  const { data: siblings } = await supabase
    .from("lessons")
    .select("id, slug, title, position")
    .eq("track_id", lesson.track_id)
    .eq("is_published", true)
    .order("position");

  return {
    lesson: {
      ...lesson,
      concepts: (lesson.lesson_concepts || []).map((item) => item.concept).filter(Boolean),
      prerequisites,
      exercises: exercises || [],
    },
    siblings: siblings || [],
  };
}

export async function getLessonProgress(supabase, userId, lessonId) {
  const [progress, exerciseProgress, drafts, attempts, mastery] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("lesson_id, status, started_at, completed_at, last_viewed_at")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
    supabase
      .from("exercise_progress")
      .select("exercise_id, status, attempts, passed_at")
      .eq("user_id", userId),
    supabase
      .from("exercise_drafts")
      .select("exercise_id, code, updated_at")
      .eq("user_id", userId),
    supabase
      .from("code_attempts")
      .select(
        "id, exercise_id, attempt_kind, execution_status, stdout, stderr, test_results, is_successful, created_at, duration_ms",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("concept_mastery")
      .select(
        "concept_id, status, evidence_count, correct_count, practical_successes, last_evidence_at",
      )
      .eq("user_id", userId),
  ]);

  const error =
    progress.error ||
    exerciseProgress.error ||
    drafts.error ||
    attempts.error ||
    mastery.error;
  if (error) throw new Error(`Unable to load lesson progress: ${error.message}`);

  return {
    lessonProgress: progress.data || null,
    exerciseProgress: exerciseProgress.data || [],
    drafts: drafts.data || [],
    attempts: attempts.data || [],
    mastery: mastery.data || [],
  };
}

export async function getCurriculumForDashboard(supabase) {
  return getCurriculumOverview(supabase);
}
