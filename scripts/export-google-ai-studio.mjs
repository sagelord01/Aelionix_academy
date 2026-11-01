#!/usr/bin/env node
/**
 * Exports training traces into strict Google AI Studio format.
 *
 * Differences from raw QLoRA traces:
 * 1. Combines the base prompt and turn context into a SINGLE system message.
 * 2. Changes the assistant role to "model" (Google AI Studio native convention).
 * 3. Removes top-level "metadata" which causes Google's validator to reject lines.
 *
 * Run: npm run traces:export-google
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SPLITS_DIR = path.join(ROOT, "data", "traces", "splits");
const OUT_DIR = path.join(ROOT, "data", "traces");

function formatForGoogleAIStudio(messages) {
  // messages[0] = system prompt
  // messages[1] = turn context
  // messages[2] = user question
  // messages[3] = assistant response

  const combinedSystem = `${messages[0].content}\n\n${messages[1].content}`;
  const userMessage = messages[messages.length - 2].content;
  const assistantReply = messages[messages.length - 1].content;

  return {
    messages: [
      { role: "system", content: combinedSystem },
      { role: "user", content: userMessage },
      { role: "model", content: assistantReply },
    ],
  };
}

function processSplit(name) {
  const inputPath = path.join(SPLITS_DIR, `${name}.jsonl`);
  if (!fs.existsSync(inputPath)) return 0;

  const lines = fs
    .readFileSync(inputPath, "utf8")
    .split("\n")
    .filter((line) => line.trim());

  const googleRows = [];

  for (const line of lines) {
    const parsed = JSON.parse(line);
    const googleRecord = formatForGoogleAIStudio(parsed.messages);
    googleRows.push(JSON.stringify(googleRecord));
  }

  const outPath = path.join(OUT_DIR, `google_ai_studio_${name}.jsonl`);
  fs.writeFileSync(outPath, googleRows.join("\n") + "\n", "utf8");
  return googleRows.length;
}

const trainCount = processSplit("train");
const evalCount = processSplit("eval");

console.log("---------------------------------------------------------");
console.log(" Google AI Studio Clean Dataset Export");
console.log("---------------------------------------------------------");
console.log(`✓ data/traces/google_ai_studio_train.jsonl (${trainCount} examples)`);
console.log(`✓ data/traces/google_ai_studio_eval.jsonl  (${evalCount} examples)`);
console.log("Ready to upload directly to aistudio.google.com -> Create Tuned Model.");
console.log("---------------------------------------------------------");
