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
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
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
        parsed = null;
      }
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

  return {
    ok: false,
    code: "malformed_response",
    response: {
      message: raw.trim().slice(0, 8000),
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
