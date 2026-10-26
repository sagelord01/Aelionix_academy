/**
 * Simple, transparent spaced-repetition scheduling inspired by SM-2.
 * It is not presented as scientifically validated. Quality is 0–5.
 */

export const MAX_INTERVAL_DAYS = 180;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.5;

export function scheduleReview(
  { intervalDays = 1, repetitions = 0, ease = 2.5, lapses = 0 } = {},
  quality = 3,
  now = new Date(),
) {
  const safeQuality = Math.max(0, Math.min(5, Math.round(Number(quality) || 0)));
  const currentEase = Math.max(MIN_EASE, Math.min(MAX_EASE, Number(ease) || 2.5));
  const currentInterval = Math.max(0, Number(intervalDays) || 0);
  const currentRepetitions = Math.max(0, Number(repetitions) || 0);

  let nextInterval;
  let nextRepetitions;
  let nextEase = currentEase;
  let nextLapses = Math.max(0, Number(lapses) || 0);

  if (safeQuality < 3) {
    nextInterval = 1;
    nextRepetitions = 0;
    nextEase = Math.max(MIN_EASE, currentEase - 0.2);
    nextLapses += 1;
  } else {
    nextRepetitions = currentRepetitions + 1;
    if (nextRepetitions === 1) {
      nextInterval = 1;
    } else if (nextRepetitions === 2) {
      nextInterval = 3;
    } else {
      nextInterval = Math.round(Math.max(currentInterval, 1) * nextEase);
    }
    if (safeQuality === 5) nextEase = Math.min(MAX_EASE, currentEase + 0.1);
    if (safeQuality === 3) nextEase = Math.max(MIN_EASE, currentEase - 0.1);
  }

  nextInterval = Math.max(1, Math.min(MAX_INTERVAL_DAYS, nextInterval));

  const dueAt = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    intervalDays: nextInterval,
    repetitions: nextRepetitions,
    ease: Number(nextEase.toFixed(2)),
    lapses: nextLapses,
    dueAt,
    quality: safeQuality,
  };
}

export function qualityFromResult({ correct, confidence = "medium" }) {
  if (!correct) {
    return confidence === "high" ? 1 : 2;
  }
  if (confidence === "high") return 5;
  if (confidence === "low") return 3;
  return 4;
}

export function isDue(item, now = new Date()) {
  if (!item?.due_at) return false;
  return new Date(item.due_at).getTime() <= now.getTime();
}
