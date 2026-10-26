import "server-only";

export async function getDueReviewItems(supabase, userId, limit = 12) {
  const { data, error } = await supabase
    .from("review_items")
    .select(
      `id, due_at, interval_days, repetitions, ease, lapses, last_reviewed_at,
       concept:concepts(id, slug, title),
       card:review_cards(id, key, type, prompt, options)`,
    )
    .eq("user_id", userId)
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(limit);

  if (error) throw new Error(`Unable to load due reviews: ${error.message}`);
  return (data || []).filter((item) => item.card);
}

export async function getUpcomingReviewItems(supabase, userId, limit = 8) {
  const { data, error } = await supabase
    .from("review_items")
    .select(
      `id, due_at, interval_days, repetitions,
       concept:concepts(id, slug, title),
       card:review_cards(id, key, type, prompt)`,
    )
    .eq("user_id", userId)
    .gt("due_at", new Date().toISOString())
    .order("due_at")
    .limit(limit);

  if (error) throw new Error(`Unable to load upcoming reviews: ${error.message}`);
  return (data || []).filter((item) => item.card);
}

export async function getReviewSummary(supabase, userId) {
  const now = new Date().toISOString();
  const [due, total, recent] = await Promise.all([
    supabase
      .from("review_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("due_at", now),
    supabase
      .from("review_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("review_attempts")
      .select("id, is_correct, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (due.error || total.error || recent.error) {
    throw new Error(
      `Unable to load the review summary: ${
        (due.error || total.error || recent.error).message
      }`,
    );
  }

  return {
    due: due.count || 0,
    total: total.count || 0,
    recent: recent.data || [],
  };
}
