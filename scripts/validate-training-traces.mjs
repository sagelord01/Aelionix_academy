#!/usr/bin/env node
/**
 * Validates the SFT dataset before you spend GPU time on it.
 *
 * Checks shape fidelity against the running app, schema conformance through
 * the real parser, and content rules that previous trace versions violated.
 *
 * Run: npm run traces:validate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerAlias } from "./lib/alias.mjs";

registerAlias();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TRACES_DIR = path.join(ROOT, "data", "traces");
const SPLITS_DIR = path.join(TRACES_DIR, "splits");

const { parseTutorResponse } = await import("@/lib/ai/response.js");
const { COACH_SYSTEM_PROMPT, PARTNER_SYSTEM_PROMPT } = await import("@/data/prompts/tutor.js");

const FORBIDDEN = [
  "ensure that your exercise is properly mapped",
  "ensure your exercise is properly linked",
  "your exercises are properly mapped",
  "properly linked to one or more concepts",
  "add it to the exercise_concepts table",
  "you need to fix the mapping",
  "[PLACEHOLDER",
  "insert good tutor response",
];

/**
 * Personality tripwire. Banter is allowed to target the mistake; these phrases
 * target the person and must never survive into a training target.
 */
const INSULTS = [
  "you're dumb",
  "you are dumb",
  "you're stupid",
  "you are stupid",
  "you're an idiot",
  "you are an idiot",
  "you suck",
  "skill issue",
  "moron",
  "hopeless",
  "you're useless",
  "you are useless",
];

const failures = [];
const warnings = [];

function fail(file, index, message) {
  failures.push(`${file}[${index}] ${message}`);
}

function warn(file, index, message) {
  warnings.push(`${file}[${index}] ${message}`);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function checkRecord(file, index, record) {
  const messages = record.messages;
  if (!Array.isArray(messages) || messages.length < 4) {
    return fail(file, index, "expected at least 4 messages (prompt, context, user, assistant)");
  }

  const roles = messages.map((message) => message.role);
  if (roles[0] !== "system" || roles[1] !== "system") {
    fail(file, index, `first two messages must be system, got ${roles.slice(0, 2).join(",")}`);
  }
  if (roles[roles.length - 1] !== "assistant") {
    fail(file, index, "last message must be the assistant target");
  }
  if (roles[roles.length - 2] !== "user") {
    fail(file, index, "assistant target must follow the user message");
  }

  const [prompt, context] = messages;
  if (prompt?.content !== COACH_SYSTEM_PROMPT && prompt?.content !== PARTNER_SYSTEM_PROMPT) {
    fail(file, index, "system prompt is not the app's COACH/PARTNER prompt");
  }
  if (!String(context?.content || "").startsWith("CONTEXT FOR THIS TURN:")) {
    fail(file, index, 'second system message must start with "CONTEXT FOR THIS TURN:"');
  }

  const target = messages[messages.length - 1].content;
  const parsed = parseTutorResponse(target);
  if (!parsed.ok || parsed.code !== "structured") {
    fail(file, index, `assistant target does not parse as structured JSON (${parsed.code})`);
    return;
  }

  const response = parsed.response;
  if (target.trim() !== JSON.stringify(response) && target.includes("\n")) {
    fail(file, index, "assistant target should be compact JSON on one line");
  }

  const hint = response.hintLevel;
  if (hint !== null && (!Number.isInteger(hint) || hint < 1 || hint > 5)) {
    fail(file, index, `hintLevel out of range: ${hint}`);
  }

  if (response.identifiedIssues.length > 4) {
    fail(file, index, "identifiedIssues exceeds 4 items");
  }

  // Socratic restraint: a hint without a question tends to read as a lecture.
  if (hint !== null && !response.message.includes("?")) {
    warn(file, index, "hint trace contains no question in message (may read as a directive)");
  }

  for (const phrase of FORBIDDEN) {
    if (target.toLowerCase().includes(phrase.toLowerCase())) {
      fail(file, index, `forbidden phrase: "${phrase}"`);
    }
  }

  for (const phrase of INSULTS) {
    if (target.toLowerCase().includes(phrase)) {
      fail(file, index, `insult in target (tease the mistake, never the person): "${phrase}"`);
    }
  }

  const metadata = record.metadata || {};
  const isBanter = Boolean(metadata.banter);
  if (isBanter !== (metadata.trace_type === "personality_banter")) {
    fail(file, index, "banter flag must be true exactly for personality_banter traces");
  }
  if (isBanter) {
    if (!metadata.persona || !metadata.mood || metadata.mood === "neutral") {
      fail(file, index, "banter trace needs a non-neutral mood and a persona");
    }
    if (!response.suggestedNextStep) {
      fail(file, index, "banter trace must still tell the learner what to do next");
    }
  }

  if (metadata.trace_type === "project_rule_explain") {
    const text = target.toLowerCase();
    if (!text.includes("exercise_concepts")) {
      fail(file, index, "project rule trace must name exercise_concepts");
    }
    if (!text.includes("union")) {
      fail(file, index, "project rule trace must explain the union rule");
    }
    if (!text.includes("no mastery evidence")) {
      fail(file, index, "project rule trace must state that no mastery evidence is recorded");
    }
  }

  const chars = messages.reduce((total, message) => total + String(message.content).length, 0);
  if (chars > 8000) {
    warn(file, index, `example is ${chars} chars (~${Math.ceil(chars / 4)} tokens); check max_length`);
  }
}

function fingerprint(record) {
  const metadata = record.metadata || {};
  return [metadata.lesson_slug, metadata.exercise_slug, metadata.trace_type, metadata.scenario_id].join("|");
}

const allPath = path.join(TRACES_DIR, "python_traces.jsonl");
const all = readJsonl(allPath);
if (!all.length) {
  console.error(`No traces found at ${allPath}. Run: npm run traces:build`);
  process.exit(1);
}

all.forEach((record, index) => checkRecord("python_traces.jsonl", index, record));

const train = readJsonl(path.join(SPLITS_DIR, "train.jsonl"));
const evalRows = readJsonl(path.join(SPLITS_DIR, "eval.jsonl"));

if (!train.length) failures.push("train.jsonl is empty");
if (!evalRows.length) failures.push("eval.jsonl is empty");
if (train.length + evalRows.length !== all.length) {
  failures.push(
    `split total (${train.length + evalRows.length}) does not match dataset (${all.length})`,
  );
}

const trainFingerprints = new Set(train.map(fingerprint));
for (const record of evalRows) {
  if (trainFingerprints.has(fingerprint(record))) {
    failures.push(`eval/train overlap on ${fingerprint(record)}`);
  }
}

const ids = all.map((record) => record.metadata?.scenario_id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) failures.push(`duplicate scenario ids: ${[...new Set(duplicates)].join(", ")}`);

const ruleTraces = all.filter((record) => record.metadata?.trace_type === "project_rule_explain");
const unmappedTraces = all.filter((record) => record.metadata?.is_mapped === false);
const banterTrain = train.filter((record) => record.metadata?.banter);
const banterShare = train.length ? Math.round((banterTrain.length / train.length) * 100) : 0;

if (banterShare > 40) {
  warn(
    "dataset",
    0,
    `banter is ${banterShare}% of train; above ~40% models start joking on real bugs`,
  );
}
if (banterTrain.length === 0) {
  warn("dataset", 0, "no banter traces in train; personalities will not transfer");
}

console.log("Dataset shape");
console.log(`  total      : ${all.length}`);
console.log(`  train      : ${train.length}`);
console.log(`  eval       : ${evalRows.length}`);
console.log(`  rule traces: ${ruleTraces.length}`);
console.log(`  unmapped   : ${unmappedTraces.length}`);
console.log(`  banter     : ${banterTrain.length} in train (${banterShare}%)`);
console.log(
  `  widest     : ~${Math.max(
    ...all.map((record) =>
      Math.ceil(record.messages.reduce((total, message) => total + message.content.length, 0) / 4),
    ),
  )} tokens`,
);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length})`);
  for (const message of warnings) console.log(`  - ${message}`);
}

if (failures.length) {
  console.error(`\nFailures (${failures.length})`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("\nAll checks passed.");
