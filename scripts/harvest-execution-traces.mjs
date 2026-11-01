#!/usr/bin/env node
/**
 * DEPRECATED - do not use for new data.
 *
 * This is the v1 harvester. It produced prose tutor replies with an invented
 * system prompt and no context block, which is not the shape the app sends and
 * not the JSON shape it parses. Its output is archived at
 * data/traces/raw/archive/python_traces_raw.v1.json and contains known-bad
 * guidance ("ensure that your exercise is properly mapped") that the learner
 * cannot act on.
 *
 * Use scripts/build-training-traces.mjs instead. It renders scenarios through
 * the app's real prompt builders and validates the result.
 *
 * Kept only as a record of the broken variants and their provenance.
 * Pass --force to regenerate the archived file anyway.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pythonTrack as pythonCurriculum } from "../data/curriculum/python.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const OUT_DIR = path.join(ROOT, "data", "traces");
const RAW_DIR = path.join(OUT_DIR, "raw");
const SPLITS_DIR = path.join(OUT_DIR, "splits");

fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(SPLITS_DIR, { recursive: true });

const SYSTEM_TUTOR = `You are assisting inside the Aelionix Academy learning workspace. 
Prioritize progressive hinting, error diagnosis, and respect the project's concept mapping rules. 
Do not dump full solutions unless explicitly necessary.

Guidelines:
- For debugging: read the traceback/error, identify the root cause, ask guiding questions or give a small hint
- For misconceptions: diagnose the underlying misconception, guide toward discovery rather than spoiling
- For progressive hinting: give the minimal next hint that helps, don't write the complete solution
- For project awareness: explain the exercise-to-concept mapping rules accurately (unmapped exercises pass but award no mastery)
- Be supportive, educational, and clear
- Keep responses focused and actionable`;

// Hand-picked broken variants for the 3 we care about most
const BROKEN_VARIANTS = {
  "debugging-and-errors/fix-the-average": [
    {
      code: `def average(values):\n    if not values:\n        return 0\n    return sum(values) / len(values)\n`,
      trace_type: "bug_diagnosis",
      judge0: { status: "test_failure", exit_code: 0, stdout: "", stderr: "" },
      user: (ex) => `I'm working on "${ex.title}".\n\nInstructions:\n${ex.instructions}\n\nMy code:\n\`\`\`python\n${ex.broken}\n\`\`\`\n\nTests I'm failing:\n- returns None for an empty list\n\nCan you help me figure out what's wrong?`
    }
  ],
  "debugging-and-errors/first-item": [
    {
      code: `def first_item(items, fallback=None):\n    # Return the first item or the fallback\n    return items[0]\n`,
      trace_type: "bug_diagnosis",
      judge0: { status: "runtime_error", exit_code: 1, stdout: "", stderr: "IndexError: list index out of range" },
      user: (ex) => `Exercise: ${ex.title}\n\n${ex.instructions}\n\nMy code keeps crashing on empty lists:\n\`\`\`python\n${ex.broken}\n\`\`\`\n\nWhat should I look at first?`
    }
  ],
  "files-and-exceptions/safe-divide": [
    {
      code: `def safe_divide(a, b):\n    return a / b\n`,
      trace_type: "bug_diagnosis",
      judge0: { status: "runtime_error", exit_code: 1, stdout: "", stderr: "ZeroDivisionError: division by zero" },
      user: (ex) => `I'm stuck on ${ex.title}.\n\n${ex.instructions}\n\nCode:\n\`\`\`python\n${ex.broken}\n\`\`\`\n\nI get a ZeroDivisionError when b is 0. How should I approach this?`
    }
  ]
};

function buildTrace({ lessonSlug, exercise, brokenCode, traceType, judge0, userPrompt, assistantResponse, conceptsMapped }) {
  const isMapped = Array.isArray(conceptsMapped) && conceptsMapped.length > 0;
  return {
    messages: [
      { role: "system", content: SYSTEM_TUTOR },
      { role: "user", content: userPrompt },
      { role: "assistant", content: assistantResponse }
    ],
    metadata: {
      lesson_slug: lessonSlug,
      exercise_slug: exercise.slug,
      concepts_mapped: conceptsMapped || [],
      is_mapped: isMapped,
      mode: "tutor_trace",
      trace_type: traceType,
      source: "python_curriculum_harvest",
      judge0,
      tests: (exercise.tests || []).map(t => ({ name: t.name, code: t.code, hidden: !!t.hidden, passed: false })),
      fixed_code_passes: null
    }
  };
}

function main() {
  if (!process.argv.includes("--force")) {
    console.error("DEPRECATED: use `npm run traces:build` (scripts/build-training-traces.mjs).");
    console.error("This harvester emits prose placeholders the app cannot parse.");
    console.error("If you really want the archived v1 output, re-run with --force.");
    process.exit(1);
  }

  const traces = [];
  const lessons = pythonCurriculum.lessons || [];

  for (const lesson of lessons) {
    const exercises = lesson.exercises || [];
    for (const ex of exercises) {
      const key = `${lesson.slug}/${ex.slug}`;
      const variants = BROKEN_VARIANTS[key];
      if (!variants) continue;

      const conceptsMapped = ex.concepts || [];
      for (const v of variants) {
        const trace = buildTrace({
          lessonSlug: lesson.slug,
          exercise: ex,
          brokenCode: v.code,
          traceType: v.trace_type,
          judge0: v.judge0,
          userPrompt: v.user({ ...ex, broken: v.code }),
          assistantResponse: "[PLACEHOLDER: insert good tutor response from baseline/hand-tuned]",
          conceptsMapped
        });
        traces.push(trace);
      }
    }
  }

  // Add project awareness trace
  traces.push({
    messages: [
      { role: "system", content: SYSTEM_TUTOR },
      { role: "user", content: "My code passed: `print('hello')`. But I got no mastery credit. Why is that?" },
      { role: "assistant", content: "[PLACEHOLDER: explain exercise_concepts, unmapped = no mastery/review, union rule, and the warning]" }
    ],
    metadata: {
      lesson_slug: null,
      exercise_slug: null,
      concepts_mapped: [],
      is_mapped: false,
      mode: "tutor_trace",
      trace_type: "project_rule_explain",
      source: "project_rule_harvest",
      judge0: { status: "success", exit_code: 0, stdout: "hello\n", stderr: "" },
      tests: [],
      fixed_code_passes: null
    }
  });

  const archiveDir = path.join(RAW_DIR, "archive");
  fs.mkdirSync(archiveDir, { recursive: true });
  const outPath = path.join(archiveDir, "python_traces_raw.v1.json");
  fs.writeFileSync(outPath, JSON.stringify(traces, null, 2));
  console.log(`Wrote ${traces.length} raw traces to ${outPath}`);
  console.log("Next: replace [PLACEHOLDER] with real tutor responses, convert to JSONL, then split.");
}

main();
