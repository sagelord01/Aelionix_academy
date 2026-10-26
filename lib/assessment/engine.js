/**
 * Adaptive assessment selection.
 *
 * The rules are intentionally simple:
 * - start near the foundations,
 * - step up after a correct answer and down after an incorrect one,
 * - favour concepts that have not been seen,
 * - only offer the practical coding check to learners with enough early evidence,
 * - stop after a bounded number of questions.
 */

export const ASSESSMENT_TARGET = 10;
export const PRACTICAL_MIN_ANSWERED = 5;

export function questionPublicShape(question) {
  if (!question) return null;
  return {
    id: question.id,
    type: question.type,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: Array.isArray(question.options) ? question.options : [],
    starterCode: question.starter_code || "",
    concept: question.concept_slug || question.concept?.slug || null,
    conceptTitle: question.concept_title || question.concept?.title || null,
  };
}

export function selectNextQuestion({
  questions,
  answeredQuestionIds,
  answeredCount = 0,
  correctCount = 0,
  lastDifficulty = 1,
  lastCorrect = null,
  executionAvailable = true,
  target = ASSESSMENT_TARGET,
}) {
  if (answeredCount >= target) return null;

  const answered = new Set(answeredQuestionIds);

  const seenConcepts = new Set(
    questions
      .filter((question) => answered.has(question.id))
      .map((question) => question.concept_slug || question.concept_id),
  );

  let desiredDifficulty = 1;
  if (lastCorrect === true) desiredDifficulty = Math.min(3, (lastDifficulty || 1) + 1);
  if (lastCorrect === false) desiredDifficulty = Math.max(1, (lastDifficulty || 2) - 1);

  const available = questions
    .filter((question) => !answered.has(question.id))
    .filter((question) => question.type !== "code" || executionAvailable)
    .filter((question) => {
      if (question.type !== "code") return true;
      const earlyCorrectRate = answeredCount > 0 ? correctCount / answeredCount : 0;
      return answeredCount >= PRACTICAL_MIN_ANSWERED && earlyCorrectRate >= 0.6;
    });

  if (available.length === 0) return null;

  const byDistance = [...available].sort((a, b) => {
    const distanceA = Math.abs(a.difficulty - desiredDifficulty);
    const distanceB = Math.abs(b.difficulty - desiredDifficulty);
    if (distanceA !== distanceB) return distanceA - distanceB;
    if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    return (a.position || 0) - (b.position || 0);
  });

  const preferred = byDistance.filter((question) => {
    if (question.type === "code") return answeredCount >= PRACTICAL_MIN_ANSWERED;
    const conceptKey = question.concept_slug || question.concept_id;
    return !seenConcepts.has(conceptKey);
  });

  return preferred[0] || byDistance[0];
}

export function summarizeAssessment(responses, questions, keys) {
  const byConcept = new Map();
  let correct = 0;
  let answered = 0;

  for (const response of responses) {
    const question = questions.find((item) => item.id === response.question_id);
    if (!question) continue;
    if (!response.skipped) {
      answered += 1;
      if (response.is_correct) correct += 1;
    }
    const conceptSlug = question.concept_slug || question.concept?.slug || "general";
    const current = byConcept.get(conceptSlug) || {
      slug: conceptSlug,
      title: question.concept_title || question.concept?.title || conceptSlug,
      answered: 0,
      correct: 0,
      skipped: 0,
    };
    if (response.skipped) {
      current.skipped += 1;
    } else {
      current.answered += 1;
      if (response.is_correct) current.correct += 1;
    }
    byConcept.set(conceptSlug, current);
  }

  return {
    answered,
    correct,
    skipped: responses.filter((item) => item.skipped).length,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
    concepts: [...byConcept.values()],
    keysReviewed: keys.length,
  };
}
