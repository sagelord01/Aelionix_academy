#!/usr/bin/env node
/**
 * Renders every benchmark case into the exact message array the app sends.
 *
 * Without this step the benchmark measures a prompt shape the product never
 * uses, so "improved" scores do not transfer to real turns.
 *
 * Run: npm run bench:eval-prompts
 * Out: benchmarks/eval_prompts.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findExercise, findLesson, renderMessages, toExecutionRow } from "./lib/app-messages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BENCH_DIR = path.join(ROOT, "benchmarks");

const benchmark = JSON.parse(
  fs.readFileSync(path.join(BENCH_DIR, "python_tutor_eval.json"), "utf8"),
);
const inputs = JSON.parse(fs.readFileSync(path.join(BENCH_DIR, "eval_app_inputs.json"), "utf8"));

const cases = [];
const missing = [];

for (const testCase of benchmark) {
  const input = inputs[testCase.id];
  if (!input || testCase.id.startsWith("_")) {
    missing.push(testCase.id);
    continue;
  }

  const lesson = findLesson(input.lesson_slug);
  const exercise = findExercise(lesson, input.exercise_slug);
  const execution = toExecutionRow(input.execution, exercise);

  const rendered = renderMessages({
    mode: "coach",
    lesson_slug: input.lesson_slug,
    exercise_slug: input.exercise_slug,
    execution,
    code: input.code || "",
    question: input.question,
  });

  cases.push({
    id: testCase.id,
    category: testCase.category,
    contamination: input.contamination || "unknown",
    messages: rendered.messages,
  });
}

if (missing.length) {
  console.error(`Missing app inputs for benchmark cases: ${missing.join(", ")}`);
  process.exit(1);
}

const outPath = path.join(BENCH_DIR, "eval_prompts.json");
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generated_by: "scripts/build-eval-prompts.mjs",
      prompt_version: "coach.v1",
      note: "Messages are produced by the app's real prompt builders. Do not hand-edit.",
      cases,
    },
    null,
    2,
  ) + "\n",
);

console.log(`Wrote ${cases.length} rendered cases to ${outPath}`);
for (const item of cases) {
  const chars = item.messages.reduce((total, message) => total + message.content.length, 0);
  console.log(
    `  ${item.id.padEnd(30)} ${item.contamination.padEnd(17)} ~${Math.ceil(chars / 4)} tokens`,
  );
}
