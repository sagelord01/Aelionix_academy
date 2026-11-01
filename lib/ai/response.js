import { z } from "zod";

export const tutorResponseSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  hintLevel: z.number().int().min(1).max(5).nullable().optional().default(null),
  identifiedIssues: z
    .array(z.string().trim().min(1).max(300))
    .max(4)
    .optional()
    .default([]),
  suggestedNextStep: z
    .string()
    .trim()
    .max(600)
    .nullable()
    .optional()
    .default(null),
  understandingCheck: z
    .string()
    .trim()
    .max(600)
    .nullable()
    .optional()
    .default(null),
  requiresExecution: z.boolean().optional().default(false),
});

function stripFences(text) {
  let trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) trimmed = fenced[1].trim();
  trimmed = trimmed.replace(/^json\s*\{/i, "{").trim();
  return trimmed;
}

function extractTolerantFields(text) {
  const msgMatch = text.match(
    /"message"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:hintLevel|identifiedIssues|suggestedNextStep|understandingCheck|requiresExecution)"/,
  );
  if (!msgMatch) return null;

  let rawMsg = msgMatch[1]
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"');

  const hintMatch = text.match(/"hintLevel"\s*:\s*(\d+|null)/);
  const issuesMatch = text.match(/"identifiedIssues"\s*:\s*\[([\s\S]*?)\]/);
  const nextStepMatch = text.match(
    /"suggestedNextStep"\s*:\s*("[\s\S]*?"|null)/,
  );
  const checkMatch = text.match(
    /"understandingCheck"\s*:\s*("[\s\S]*?"|null)/,
  );
  const reqMatch = text.match(/"requiresExecution"\s*:\s*(true|false)/);

  let issues = [];
  if (issuesMatch && issuesMatch[1].trim()) {
    try {
      issues = JSON.parse(`[${issuesMatch[1]}]`);
    } catch {
      issues = issuesMatch[1]
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }
  }

  let nextStep = null;
  if (nextStepMatch && nextStepMatch[1] !== "null") {
    try {
      nextStep = JSON.parse(nextStepMatch[1]);
    } catch {
      nextStep = nextStepMatch[1].replace(/^"|"$/g, "").trim();
    }
  }

  let check = null;
  if (checkMatch && checkMatch[1] !== "null") {
    try {
      check = JSON.parse(checkMatch[1]);
    } catch {
      check = checkMatch[1].replace(/^"|"$/g, "").trim();
    }
  }

  return {
    message: rawMsg,
    hintLevel:
      hintMatch && hintMatch[1] !== "null"
        ? parseInt(hintMatch[1], 10)
        : null,
    identifiedIssues: issues.slice(0, 4),
    suggestedNextStep: nextStep,
    understandingCheck: check,
    requiresExecution: reqMatch ? reqMatch[1] === "true" : false,
  };
}

/**
 * Tolerant structured-output parser. A malformed model response must never
 * crash the workspace: fall back to a plain-text message.
 */
export function parseTutorResponse(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return {
      ok: false,
      code: "empty_response",
      response: null,
      rawText: "",
    };
  }

  const text = stripFences(raw);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        parsed = extractTolerantFields(text);
      }
    } else {
      parsed = extractTolerantFields(text);
    }
  }

  if (parsed && typeof parsed === "object") {
    const validated = tutorResponseSchema.safeParse(parsed);
    if (validated.success) {
      return {
        ok: true,
        code: "structured",
        response: validated.data,
        rawText: raw,
      };
    }
  }

  const fallbackClean = raw
    .trim()
    .replace(/^json\s*\{/i, "{")
    .replace(/^\{[\s\S]*?"message"\s*:\s*"/i, "")
    .replace(/"\s*,\s*"hintLevel"[\s\S]*$/i, "")
    .replace(/\\n/g, "\n");

  return {
    ok: false,
    code: "malformed_response",
    response: {
      message: (fallbackClean.trim() || raw.trim()).slice(0, 8000),
      hintLevel: null,
      identifiedIssues: [],
      suggestedNextStep: null,
      understandingCheck: null,
      requiresExecution: false,
      parseFallback: true,
    },
    rawText: raw,
  };
}

export function serializeTutorMessage(response) {
  return response?.message || "I could not produce a response.";
}
