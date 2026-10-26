import "server-only";

export async function getLatestLessonConversation(
  supabase,
  userId,
  lessonId,
  mode,
) {
  const { data, error } = await supabase
    .from("tutor_conversations")
    .select(
      "id, mode, title, lesson_id, exercise_id, exploration_session_id, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .eq("mode", mode)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Unable to load tutor conversation: ${error.message}`);
  if (!data) return { conversation: null, messages: [] };

  const { data: messages, error: messageError } = await supabase
    .from("tutor_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", data.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (messageError) {
    throw new Error(`Unable to load tutor messages: ${messageError.message}`);
  }

  return {
    conversation: data,
    messages: (messages || []).reverse(),
  };
}

export async function getExplorationSession(supabase, userId, sessionId) {
  if (!sessionId) return null;
  const { data, error } = await supabase
    .from("exploration_sessions")
    .select("id, topic, language, status, created_at, updated_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load exploration session: ${error.message}`);
  return data;
}

export async function getRecentExplorations(supabase, userId, limit = 8) {
  const { data, error } = await supabase
    .from("exploration_sessions")
    .select("id, topic, language, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load explorations: ${error.message}`);
  return data || [];
}

export async function getExplorationConversation(supabase, userId, sessionId, mode) {
  const { data, error } = await supabase
    .from("tutor_conversations")
    .select("id, mode, title, exploration_session_id, created_at, updated_at")
    .eq("user_id", userId)
    .eq("exploration_session_id", sessionId)
    .eq("mode", mode)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Unable to load exploration conversation: ${error.message}`);
  if (!data) return { conversation: null, messages: [] };

  const { data: messages, error: messageError } = await supabase
    .from("tutor_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", data.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(16);

  if (messageError) {
    throw new Error(`Unable to load exploration messages: ${messageError.message}`);
  }

  return {
    conversation: data,
    messages: (messages || []).reverse(),
  };
}
