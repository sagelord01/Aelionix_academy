export function formatDate(value, options = {}) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function relativeTime(value, now = new Date()) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const delta = date.getTime() - now.getTime();
  const past = delta <= 0;
  const seconds = Math.abs(Math.round(delta / 1000));

  if (seconds < 45) return "just now";
  const units = [
    { limit: 60 * 60, size: 60, name: "minute" },
    { limit: 60 * 60 * 24, size: 60 * 60, name: "hour" },
    { limit: 60 * 60 * 24 * 30, size: 60 * 60 * 24, name: "day" },
    { limit: 60 * 60 * 24 * 365, size: 60 * 60 * 24 * 30, name: "month" },
    { limit: Infinity, size: 60 * 60 * 24 * 365, name: "year" },
  ];

  for (const unit of units) {
    if (seconds < unit.limit) {
      const count = Math.max(1, Math.round(seconds / unit.size));
      return past
        ? `${count} ${unit.name}${count === 1 ? "" : "s"} ago`
        : `in ${count} ${unit.name}${count === 1 ? "" : "s"}`;
    }
  }
  return "";
}

export function formatDuration(durationMs) {
  if (!Number.isFinite(Number(durationMs))) return "—";
  const ms = Number(durationMs);
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
}

export function formatMinutes(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function activityLabel(kind) {
  switch (kind) {
    case "onboarding_completed":
      return "Onboarding completed";
    case "assessment_started":
      return "Assessment started";
    case "assessment_completed":
      return "Assessment completed";
    case "lesson_started":
      return "Lesson opened";
    case "exercise_passed":
      return "Exercise passed";
    case "lesson_completed":
      return "Lesson completed";
    case "review_completed":
      return "Review answered";
    case "exploration_started":
      return "Exploration started";
    case "tutor_message":
      return "Tutor exchange";
    default:
      return titleCase(kind);
  }
}
