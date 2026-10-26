/**
 * Transparent mastery rules. This is deliberately simple and inspectable:
 * one right answer does not create mastery, and practical success is tracked
 * separately from question accuracy.
 */

export const MASTERY_STATUSES = [
  "not_assessed",
  "insufficient_evidence",
  "developing",
  "demonstrated",
  "ready_for_challenge",
];

export const MASTERY_LABELS = {
  not_assessed: "Not assessed",
  insufficient_evidence: "Insufficient evidence",
  developing: "Developing",
  demonstrated: "Demonstrated",
  ready_for_challenge: "Ready for a challenge",
};

export function deriveMasteryStatus({
  evidenceCount = 0,
  correctCount = 0,
  practicalSuccesses = 0,
} = {}) {
  if (!Number.isFinite(evidenceCount) || evidenceCount <= 0) {
    return "not_assessed";
  }

  const accuracy = correctCount / evidenceCount;

  if (evidenceCount < 2) return "insufficient_evidence";
  if (accuracy >= 0.85 && practicalSuccesses >= 2 && evidenceCount >= 4) {
    return "ready_for_challenge";
  }
  if (accuracy >= 0.7 && practicalSuccesses >= 1) {
    return "demonstrated";
  }
  return "developing";
}

function readCount(row, snakeKey, camelKey) {
  const value = row[snakeKey] ?? row[camelKey];
  return Math.max(0, Number(value) || 0);
}

export function applyEvidence(
  current = {},
  { correct = false, practical = false } = {},
) {
  const evidenceCount = readCount(current, "evidence_count", "evidenceCount") + 1;
  const correctCount = readCount(current, "correct_count", "correctCount") + (correct ? 1 : 0);
  const practicalSuccesses =
    readCount(current, "practical_successes", "practicalSuccesses") +
    (practical && correct ? 1 : 0);

  return {
    evidenceCount,
    correctCount,
    practicalSuccesses,
    status: deriveMasteryStatus({ evidenceCount, correctCount, practicalSuccesses }),
  };
}

export function masteryTone(status) {
  switch (status) {
    case "ready_for_challenge":
      return "success";
    case "demonstrated":
      return "success";
    case "developing":
      return "warning";
    case "insufficient_evidence":
      return "neutral";
    default:
      return "neutral";
  }
}
