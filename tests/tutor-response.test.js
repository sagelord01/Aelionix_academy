import { describe, expect, it } from "vitest";
import {
  parseTutorResponse,
  serializeTutorMessage,
  tutorResponseSchema,
} from "@/lib/ai/response";

const valid = {
  message: "Check the loop condition.",
  hintLevel: 2,
  identifiedIssues: ["The loop never changes the counter"],
  suggestedNextStep: "Print the counter inside the loop",
  understandingCheck: "What ends a while loop?",
  requiresExecution: true,
};

describe("parseTutorResponse", () => {
  it("accepts a valid structured response", () => {
    const result = parseTutorResponse(JSON.stringify(valid));
    expect(result.ok).toBe(true);
    expect(result.code).toBe("structured");
    expect(result.response).toEqual(valid);
  });

  it("strips markdown fences around JSON", () => {
    const result = parseTutorResponse(
      `\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``,
    );
    expect(result.ok).toBe(true);
    expect(result.response.message).toBe(valid.message);
  });

  it("extracts a JSON object surrounded by prose", () => {
    const result = parseTutorResponse(
      `Here is the response:\n${JSON.stringify(valid)}\nAnything else?`,
    );
    expect(result.ok).toBe(true);
    expect(result.response.hintLevel).toBe(2);
  });

  it("fills defaults for optional fields", () => {
    const result = parseTutorResponse(
      JSON.stringify({ message: "A plain answer." }),
    );
    expect(result.ok).toBe(true);
    expect(result.response).toMatchObject({
      message: "A plain answer.",
      hintLevel: null,
      identifiedIssues: [],
      suggestedNextStep: null,
      understandingCheck: null,
      requiresExecution: false,
    });
  });

  it("falls back to text when the model returns prose", () => {
    const result = parseTutorResponse("Try printing the value before the loop.");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("malformed_response");
    expect(result.response.message).toBe(
      "Try printing the value before the loop.",
    );
    expect(result.response.parseFallback).toBe(true);
  });

  it("falls back to text when JSON violates the schema", () => {
    const result = parseTutorResponse(
      JSON.stringify({ message: "", hintLevel: 99 }),
    );
    expect(result.ok).toBe(false);
    expect(result.response.parseFallback).toBe(true);
  });

  it("handles an empty response without throwing", () => {
    const result = parseTutorResponse("   ");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("empty_response");
    expect(result.response).toBeNull();
  });
});

describe("tutorResponseSchema", () => {
  it("caps identified issues at four", () => {
    const result = tutorResponseSchema.safeParse({
      ...valid,
      identifiedIssues: ["one", "two", "three", "four", "five"],
    });
    expect(result.success).toBe(false);
  });

  it("requires a non-empty message", () => {
    expect(
      tutorResponseSchema.safeParse({ ...valid, message: "  " }).success,
    ).toBe(false);
  });
});

describe("serializeTutorMessage", () => {
  it("returns the message or a truthful fallback", () => {
    expect(serializeTutorMessage({ message: "Hello" })).toBe("Hello");
    expect(serializeTutorMessage(null)).toBe("I could not produce a response.");
  });
});
