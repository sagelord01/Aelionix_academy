/**
 * Shared labels and hints for the choices stored on a profile. Values must
 * match the database constraints in supabase/migrations/0001_initial_schema.sql.
 */

export const goalOptions = [
  { value: "general", label: "General foundations", hint: "Build fluency without a deadline." },
  { value: "career", label: "Career change", hint: "Prepare for a role that uses code." },
  { value: "projects", label: "Ship projects", hint: "Turn ideas into working programs." },
  { value: "interviews", label: "Interview practice", hint: "Explain and solve under pressure." },
  { value: "academic", label: "Academic work", hint: "Support a course or research." },
  { value: "curiosity", label: "Curiosity", hint: "Follow questions where they lead." },
];

export const levelOptions = [
  { value: "beginner", label: "Starting out", hint: "Little or no programming experience." },
  {
    value: "some_experience",
    label: "Some exposure",
    hint: "I have tried tutorials or small scripts.",
  },
  { value: "intermediate", label: "Comfortable", hint: "I can build small working programs." },
  {
    value: "advanced",
    label: "Experienced",
    hint: "I want a structured refresher or new angles.",
  },
];

export const modeOptions = [
  {
    value: "coach",
    label: "Independent Coding Coach",
    hint: "Guides with progressive hints and questions. Withholds full solutions until you have tried.",
  },
  {
    value: "partner",
    label: "AI Coding Partner",
    hint: "Explains directly, plans with you, and may generate suggested code when asked.",
  },
];

export const hintOptions = [
  { value: "hints", label: "Hints first", hint: "Prefer guidance over answers." },
  { value: "balanced", label: "Balanced", hint: "Adapt to how stuck I am." },
  { value: "direct", label: "Direct", hint: "Explain plainly, then let me apply it." },
];

export const weeklyMinuteOptions = [
  { value: 60, label: "About 1 hour" },
  { value: 120, label: "About 2 hours" },
  { value: 180, label: "About 3 hours" },
  { value: 240, label: "About 4 hours" },
  { value: 300, label: "About 5 hours" },
  { value: 450, label: "About 7.5 hours" },
  { value: 600, label: "About 10 hours" },
  { value: 900, label: "More than 10 hours" },
];
