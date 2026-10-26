import "server-only";
import {
  buildChatMessages,
  buildTutorContext,
  getSystemPrompt,
} from "@/lib/ai/context";
import { requestTutor } from "@/lib/ai/provider";
import { recordLearningEvent } from "@/lib/progress/record";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export class TutorError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "TutorError";
    this.code = code;
    this.status = status;
  }
}

async function loadLesson(admin, lessonId) {
  if (!lessonId) return null;
  const { data, error } = await admin
    .from("lessons")
    .select(
      `id, slug, title, objectives, is_published,
       lesson_concepts(concept:concepts(id, slug, title))`,
    )
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new TutorError("lesson_read_failed", "The lesson could not be loaded.", 500);
  }
  if (!data) throw new TutorError("lesson_not_found", "Lesson not found.", 404);
  return {
    ...data,
    concepts: (data.lesson_concepts || []).map((item) => item.concept).filter(Boolean),
  };
}

async function loadExercise(admin, exerciseId) {
  if (!exerciseId) return null;
  const { data, error } = await admin
    .from("exercises")
    .select(
      "id, lesson_id, title, instructions, expected_behavior, starter_code, hints, is_published",
    )
    .eq("id", exerciseId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new TutorError("exercise_read_failed", "The exercise could not be loaded.", 500);
  }
  if (!data) throw new TutorError("exercise_not_found", "Exercise not found.", 404);
  return data;
}

async function loadConversation(admin, userId, conversationId) {
  const { data, error } = await admin
    .from("tutor_conversations")
    .select(
      "id, user_id, lesson_id, exercise_id, exploration_session_id, mode, title, created_at, updated_at",
    )
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new TutorError("conversation_read_failed", "The conversation could not be loaded.", 500);
  }
  if (!data) throw new TutorError("conversation_not_found", "Conversation not found.", 404);
  return data;
}

async function loadHistory(admin, conversationId, userId) {
  const { data, error } = await admin
    .from("tutor_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    throw new TutorError("history_read_failed", "The conversation history could not be loaded.", 500);
  }
  return (data || []).reverse();
}

async function loadExploration(admin, userId, sessionId) {
  if (!sessionId) return null;
  const { data, error } = await admin
    .from("exploration_sessions")
    .select("id, topic, language, status")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new TutorError("exploration_read_failed", "The exploration could not be loaded.", 500);
  }
  if (!data) throw new TutorError("exploration_not_found", "Exploration not found.", 404);
  return data;
}

async function loadMastery(admin, userId, concepts) {
  let query = admin
    .from("concept_mastery")
    .select(
      "concept_id, status, evidence_count, correct_count, practical_successes, concept:concepts(title, slug)",
    )
    .eq("user_id", userId);

  if (concepts?.length) {
    query = query.in(
      "concept_id",
      concepts.map((concept) => concept.id),
    );
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(20);
  if (error) return [];
  return data || [];
}

async function loadExecutionEvidence(admin, userId, { attemptId, exerciseId }) {
  let query = admin
    .from("code_attempts")
    .select(
      "id, execution_status, stdout, stderr, exit_code, duration_ms, test_results, is_successful, created_at, exercise_id",
    )
    .eq("user_id", userId);

  if (attemptId) query = query.eq("id", attemptId);
  else if (exerciseId) query = query.eq("exercise_id", exerciseId).order("created_at", { ascending: false }).limit(1);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) return null;
  return data || null;
}

/**
 * Persist a learner message, request a real tutor completion, then persist the
 * assistant response. Ownership of every referenced record is checked against
 * the authenticated user before the service role is used.
 */
export async function sendTutorMessage({
  admin,
  userId,
  input,
  profile,
}) {
  if (!admin) {
    throw new TutorError(
      "setup_required",
      "Tutor conversations need SUPABASE_SERVICE_ROLE_KEY on the server. The tutor is unavailable until it is configured.",
      503,
    );
  }

  const limit = await enforceRateLimit({ admin, userId, kind: "ai" });
  if (!limit.allowed) {
    throw new TutorError("rate_limited", limit.message, 429);
  }

  let conversation = null;
  if (input.conversationId) {
    conversation = await loadConversation(admin, userId, input.conversationId);
    if (conversation.mode !== input.mode) {
      throw new TutorError(
        "mode_mismatch",
        "That conversation belongs to the other tutor mode. Start a new conversation for this mode.",
        409,
      );
    }
  }

  const lessonId = conversation?.lesson_id || input.lessonId || null;
  const exerciseId = conversation?.exercise_id || input.exerciseId || null;
  const explorationSessionId =
    conversation?.exploration_session_id || input.explorationSessionId || null;

  const [lesson, exercise, exploration] = await Promise.all([
    loadLesson(admin, lessonId),
    loadExercise(admin, exerciseId),
    loadExploration(admin, userId, explorationSessionId),
  ]);

  if (exercise && lesson && exercise.lesson_id !== lesson.id) {
    throw new TutorError(
      "exercise_mismatch",
      "That exercise does not belong to the selected lesson.",
      400,
    );
  }

  if (!conversation) {
    const title = (
      exercise?.title ||
      lesson?.title ||
      exploration?.topic ||
      "Tutoring session"
    ).slice(0, 120);

    const { data: created, error } = await admin
      .from("tutor_conversations")
      .insert({
        user_id: userId,
        lesson_id: lesson?.id || null,
        exercise_id: exercise?.id || null,
        exploration_session_id: exploration?.id || null,
        mode: input.mode,
        title,
      })
      .select("id, mode, title")
      .single();

    if (error) {
      throw new TutorError(
        "conversation_write_failed",
        "A tutor conversation could not be created.",
        500,
      );
    }
    conversation = created;
  }

  const [history, mastery, execution] = await Promise.all([
    loadHistory(admin, conversation.id, userId),
    loadMastery(admin, userId, lesson?.concepts || []),
    loadExecutionEvidence(admin, userId, {
      attemptId: input.attemptId || null,
      exerciseId: exercise?.id || null,
    }),
  ]);

  const { error: userMessageError } = await admin.from("tutor_messages").insert({
    conversation_id: conversation.id,
    user_id: userId,
    role: "user",
    content: input.message,
    metadata: { codeAttached: Boolean(input.code) },
  });

  if (userMessageError) {
    throw new TutorError(
      "message_write_failed",
      "Your message could not be saved. Try again.",
      500,
    );
  }

  const { prompt, version } = getSystemPrompt(input.mode);
  const context = buildTutorContext({
    mode: input.mode,
    profile,
    lesson: lesson
      ? {
          ...lesson,
          prerequisites: [],
        }
      : exploration
        ? {
            title: `Exploration: ${exploration.topic}`,
            objectives: ["Explore the topic with a partner and produce something runnable."],
          }
        : null,
    exercise,
    mastery,
    execution,
    code: input.code || "",
    question: input.currentQuestion || "",
  });

  let completion;
  try {
    completion = await requestTutor({
      systemPrompt: prompt,
      messages: buildChatMessages({
        context,
        history,
        userMessage: input.message,
      }),
    });
  } catch (error) {
    await admin.from("ai_usage").insert({
      user_id: userId,
      route: "tutor",
      provider: error?.code || "unknown",
      model: null,
      status: error?.code === "ai_rate_limited" ? "rate_limited" : "error",
      input_tokens: null,
      output_tokens: null,
    });
    throw error;
  }

  const response = completion.response;
  const { data: assistantMessage, error: assistantError } = await admin
    .from("tutor_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: userId,
      role: "assistant",
      content: response.message.slice(0, 20000),
      metadata: {
        hintLevel: response.hintLevel ?? null,
        identifiedIssues: response.identifiedIssues || [],
        suggestedNextStep: response.suggestedNextStep || null,
        understandingCheck: response.understandingCheck || null,
        requiresExecution: Boolean(response.requiresExecution),
        promptVersion: version,
        parseStatus: completion.parseStatus,
        model: completion.model,
        provider: completion.provider,
      },
    })
    .select("id, role, content, metadata, created_at")
    .single();

  if (assistantError) {
    throw new TutorError(
      "message_write_failed",
      "The tutor replied, but the response could not be saved. Copy anything important before retrying.",
      500,
    );
  }

  await admin
    .from("tutor_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversation.id)
    .eq("user_id", userId);

  await admin.from("ai_usage").insert({
    user_id: userId,
    route: input.explorationSessionId ? "explore" : "tutor",
    provider: completion.provider,
    model: completion.model,
    status:
      completion.parseStatus === "structured" ? "success" : "invalid_response",
    input_tokens: completion.usage.inputTokens,
    output_tokens: completion.usage.outputTokens,
  });

  await recordLearningEvent(admin, {
    userId,
    kind: "tutor_message",
    lessonId: lesson?.id || null,
    exerciseId: exercise?.id || null,
    metadata: {
      mode: input.mode,
      conversationId: conversation.id,
      explorationSessionId: exploration?.id || null,
    },
  });

  return {
    conversationId: conversation.id,
    conversationTitle: conversation.title,
    mode: input.mode,
    message: assistantMessage,
    hintLevel: response.hintLevel ?? null,
    identifiedIssues: response.identifiedIssues || [],
    suggestedNextStep: response.suggestedNextStep || null,
    understandingCheck: response.understandingCheck || null,
    requiresExecution: Boolean(response.requiresExecution),
    parseStatus: completion.parseStatus,
    model: completion.model,
    usage: completion.usage,
    rateLimitRemaining: limit.remaining ?? null,
  };
}
