#!/usr/bin/env node
/**
 * Builds the SFT dataset for the Aelionix tutor.
 *
 * The whole point of this script is fidelity: it renders every training
 * example with the *same* prompt builders the running app uses, so the
 * adapter is trained on the distribution it will actually be served.
 *
 *   system    = COACH_SYSTEM_PROMPT            (data/prompts/tutor.js)
 *   system    = "CONTEXT FOR THIS TURN:\n..."  (lib/ai/context.js)
 *   user      = the learner's message          (lib/ai/context.js)
 *   assistant = one JSON object                (lib/ai/response.js)
 *
 * Run: npm run traces:build
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findExercise,
  findLesson,
  renderMessages,
  toExecutionRow,
} from "./lib/app-messages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "traces");
const SPLITS_DIR = path.join(OUT_DIR, "splits");

const { scenarios } = await import(
  "@/data/traces/scenarios/python-tutor-scenarios.mjs"
);

const EXIT_CODES = { success: 0, test_failure: 0, runtime_error: 1 };

function toMetadata(scenario, { lesson, exercise, execution }) {
  const concepts = exercise?.concepts || [];
  return {
    scenario_id: scenario.id,
    lesson_slug: lesson?.slug || null,
    exercise_slug: exercise?.slug || null,
    concepts_mapped: concepts,
    is_mapped: concepts.length > 0,
    mode: scenario.mode,
    trace_type: scenario.trace_type,
    source: "authored_v2",
    persona: scenario.persona || "coach_default",
    banter: Boolean(scenario.banter),
    mood: scenario.mood || "neutral",
    judge0: {
      status: execution?.status || "not_executed",
      exit_code: execution ? (EXIT_CODES[execution.status] ?? null) : null,
      stdout: execution?.stdout || "",
      stderr: execution?.stderr || "",
    },
    tests: (exercise?.tests || []).map((test) => ({
      name: test.name,
      code: test.code,
      hidden: Boolean(test.hidden),
      passed:
        (execution?.test_results || []).find((item) => item.name === test.name)
          ?.passed ?? false,
    })),
    fixed_code_passes: null,
  };
}

function buildOne(scenario) {
  const lesson = findLesson(scenario.lesson_slug);
  const exercise = findExercise(lesson, scenario.exercise_slug);
  const execution = toExecutionRow(scenario.execution, exercise);

  const rendered = renderMessages({
    mode: scenario.mode,
    profile: scenario.profile,
    lesson_slug: scenario.lesson_slug,
    exercise_slug: scenario.exercise_slug,
    mastery: scenario.mastery || [],
    execution,
    code: scenario.code || "",
    question: scenario.question,
    history: scenario.history || [],
  });

  const messages = [
    ...rendered.messages,
    { role: "assistant", content: JSON.stringify(scenario.target) },
  ];

  return {
    record: {
      messages,
      metadata: toMetadata(scenario, { lesson, exercise, execution }),
    },
    stats: {
      id: scenario.id,
      split: scenario.split,
      chars: messages.reduce((total, message) => total + message.content.length, 0),
      hintLevel: scenario.target.hintLevel,
    },
  };
}

const built = scenarios.map(buildOne);
const records = built.map((item) => item.record);
const stats = built.map((item) => item.stats);

fs.mkdirSync(SPLITS_DIR, { recursive: true });

const toJsonl = (rows) => rows.map((row) => JSON.stringify(row)).join("\n") + "\n";

fs.writeFileSync(path.join(OUT_DIR, "python_traces.jsonl"), toJsonl(records));
for (const split of ["train", "eval"]) {
  const rows = records.filter((_, index) => stats[index].split === split);
  fs.writeFileSync(path.join(SPLITS_DIR, `${split}.jsonl`), toJsonl(rows));
}

const approxTokens = (chars) => Math.ceil(chars / 4);
const widest = Math.max(...stats.map((item) => approxTokens(item.chars)));

console.log("Scenario                                    split  chars  ~tok  hint");
console.log("-".repeat(74));
for (const item of stats) {
  console.log(
    `${item.id.padEnd(42)} ${item.split.padEnd(6)} ${String(item.chars).padStart(5)}  ${String(
      approxTokens(item.chars),
    ).padStart(4)}  ${String(item.hintLevel ?? "-").padStart(4)}`,
  );
}
console.log("-".repeat(74));
console.log(
  `train: ${stats.filter((item) => item.split === "train").length}  eval: ${
    stats.filter((item) => item.split === "eval").length
  }`,
);
console.log(
  `Widest example: ~${widest} tokens (set training max_length >= ${Math.ceil(widest / 128) * 128})`,
);

if (widest > 1800) {
  console.warn(
    "WARNING: widest example exceeds 1800 tokens. Truncation will cut the assistant target.",
  );
}
