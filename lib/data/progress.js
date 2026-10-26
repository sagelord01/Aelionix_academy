import "server-only";

export async function getRecentActivity(supabase, userId, limit = 8) {
  const { data, error } = await supabase
    .from("learning_events")
    .select(
      "id, kind, lesson_id, exercise_id, metadata, created_at, lesson:lessons(title, slug)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load recent activity: ${error.message}`);
  return data || [];
}

export async function getMastery(supabase, userId) {
  const { data, error } = await supabase
    .from("concept_mastery")
    .select(
      "concept_id, status, evidence_count, correct_count, practical_successes, last_evidence_at, concept:concepts(id, slug, title, description)",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Unable to load mastery: ${error.message}`);
  return data || [];
}

export async function getAssessmentHistory(supabase, userId, limit = 10) {
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, status, started_at, completed_at, summary, definition:assessment_definitions(title, slug)",
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load assessment history: ${error.message}`);
  return data || [];
}

export async function getLessonProgressList(supabase, userId) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status, started_at, completed_at, last_viewed_at")
    .eq("user_id", userId);
  if (error) throw new Error(`Unable to load lesson progress: ${error.message}`);
  return data || [];
}

export async function getExerciseProgressList(supabase, userId) {
  const { data, error } = await supabase
    .from("exercise_progress")
    .select("exercise_id, status, attempts, passed_at")
    .eq("user_id", userId);
  if (error) throw new Error(`Unable to load exercise progress: ${error.message}`);
  return data || [];
}

export async function getActivitySeries(supabase, userId, days = 28) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("learning_events")
    .select("kind, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at");

  if (error) throw new Error(`Unable to load activity: ${error.message}`);

  const buckets = new Map();
  for (let index = 0; index < days; index += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    buckets.set(date.toISOString().slice(0, 10), {
      date: date.toISOString().slice(0, 10),
      count: 0,
    });
  }

  for (const event of data || []) {
    const key = event.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.get(key).count += 1;
  }

  return [...buckets.values()];
}

export async function getRecentAttempts(supabase, userId, limit = 20) {
  const { data, error } = await supabase
    .from("code_attempts")
    .select(
      "id, exercise_id, lesson_id, attempt_kind, execution_status, is_successful, duration_ms, created_at, exercise:exercises(title, slug), lesson:lessons(title, slug)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load code attempts: ${error.message}`);
  return data || [];
}

export async function getReviewAttempts(supabase, userId, limit = 25) {
  const { data, error } = await supabase
    .from("review_attempts")
    .select(
      "id, is_correct, quality, confidence, created_at, item:review_items(card:review_cards(prompt, type))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load review history: ${error.message}`);
  return data || [];
}

export async function getConceptCatalog(supabase) {
  const { data, error } = await supabase
    .from("concepts")
    .select("id, slug, title, description")
    .order("title");

  if (error) throw new Error(`Unable to load concepts: ${error.message}`);
  return data || [];
}

function counted(result, label) {
  if (result.error) {
    throw new Error(`Unable to load ${label}: ${result.error.message}`);
  }
  return result.count || 0;
}

export async function getProgressCounts(supabase, userId) {
  const [
    lessonsCompleted,
    exercisesPassed,
    codeAttempts,
    submissions,
    reviewAttempts,
    correctReviews,
    completedAssessments,
  ] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("exercise_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "passed"),
    supabase
      .from("code_attempts")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("code_attempts")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("attempt_kind", "submit"),
    supabase
      .from("review_attempts")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("review_attempts")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true),
    supabase
      .from("assessments")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);

  return {
    lessonsCompleted: counted(lessonsCompleted, "completed lessons"),
    exercisesPassed: counted(exercisesPassed, "passed exercises"),
    codeAttempts: counted(codeAttempts, "code attempts"),
    submissions: counted(submissions, "code submissions"),
    reviewAttempts: counted(reviewAttempts, "review attempts"),
    correctReviews: counted(correctReviews, "correct reviews"),
    completedAssessments: counted(completedAssessments, "completed assessments"),
  };
}

export async function getDashboardStats(supabase, userId) {
  const now = new Date().toISOString();
  const [due, completedLessons, attempts, assessment] = await Promise.all([
    supabase
      .from("review_items")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("due_at", now),
    supabase
      .from("lesson_progress")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("code_attempts")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("assessments")
      .select("id, completed_at, summary")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (assessment.error) {
    throw new Error(`Unable to load the latest assessment: ${assessment.error.message}`);
  }

  return {
    dueReviews: counted(due, "due reviews"),
    completedLessons: counted(completedLessons, "completed lessons"),
    codeAttempts: counted(attempts, "code attempts"),
    lastAssessment: assessment.data || null,
  };
}
