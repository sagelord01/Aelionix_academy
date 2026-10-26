import "server-only";
import { gradeTextOrChoice } from "@/lib/assessment/grade";
import { recordLearningEvent } from "@/lib/progress/record";
import { qualityFromResult, scheduleReview } from "@/lib/review/schedule";

export class ReviewError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ReviewError";
    this.code = code;
    this.status = status;
  }
}

export async function answerReviewItem({
  admin,
  userId,
  itemId,
  response = {},
  confidence = "medium",
  selfQuality,
}) {
  if (!admin) {
    throw new ReviewError(
      "setup_required",
      "Review progress needs SUPABASE_SERVICE_ROLE_KEY on the server. Nothing was saved.",
      503,
    );
  }

  const { data: item, error } = await admin
    .from("review_items")
    .select(
      `id, user_id, card_id, concept_id, lesson_id, due_at, interval_days,
       repetitions, ease, lapses, last_reviewed_at,
       card:review_cards(id, type, prompt, options, key_data:review_card_keys(answer, explanation))`,
    )
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ReviewError(
      "review_read_failed",
      "The review item could not be loaded.",
      500,
    );
  }
  if (!item?.card) {
    throw new ReviewError("review_not_found", "Review item not found.", 404);
  }

  const keyData = Array.isArray(item.card.key_data)
    ? item.card.key_data[0]
    : item.card.key_data;
  if (!keyData?.answer) {
    throw new ReviewError(
      "review_invalid",
      "This review card has no key configured and cannot be graded.",
      503,
    );
  }

  const question = {
    type: item.card.type,
    options: (item.card.options || []).map((text, index) => ({
      id: String(index),
      text: typeof text === "string" ? text : text?.text,
    })),
  };

  const isCorrect = gradeTextOrChoice(question, keyData.answer, response);

  const quality =
    Number.isInteger(selfQuality) && selfQuality >= 0 && selfQuality <= 5
      ? selfQuality
      : qualityFromResult({ correct: isCorrect, confidence });

  const next = scheduleReview(
    {
      intervalDays: item.interval_days,
      repetitions: item.repetitions,
      ease: item.ease,
      lapses: item.lapses,
    },
    quality,
  );

  const { error: updateError } = await admin
    .from("review_items")
    .update({
      due_at: next.dueAt.toISOString(),
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      ease: next.ease,
      lapses: next.lapses,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("user_id", userId);

  if (updateError) {
    throw new ReviewError(
      "review_write_failed",
      "The review schedule could not be updated.",
      500,
    );
  }

  const { error: attemptError } = await admin.from("review_attempts").insert({
    user_id: userId,
    review_item_id: item.id,
    response,
    is_correct: isCorrect,
    quality: next.quality,
    confidence,
  });

  if (attemptError) {
    throw new ReviewError(
      "review_write_failed",
      "The review attempt could not be saved.",
      500,
    );
  }

  await recordLearningEvent(admin, {
    userId,
    kind: "review_completed",
    lessonId: item.lesson_id,
    metadata: {
      reviewItemId: item.id,
      correct: isCorrect,
      quality: next.quality,
    },
  });

  return {
    isCorrect,
    explanation: keyData.explanation || "",
    quality: next.quality,
    nextDueAt: next.dueAt.toISOString(),
    intervalDays: next.intervalDays,
    acceptableAnswer: isCorrect ? null : keyData.answer,
    response,
  };
}
