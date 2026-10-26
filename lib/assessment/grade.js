/**
 * Server-safe answer grading. This module is pure so it can be covered by
 * tests without a database or execution provider.
 */

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\s+/g, " ");
}

function numericValue(value) {
  const text = normalizeText(value);
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function acceptedValues(answer = {}) {
  const values = [];
  if (typeof answer.value === "string") values.push(answer.value);
  if (Array.isArray(answer.acceptedAnswers)) {
    for (const item of answer.acceptedAnswers) {
      if (typeof item === "string") values.push(item);
    }
  }
  return values;
}

export function matchesTextAnswer(answer, responseValue) {
  const submitted = normalizeText(responseValue);
  if (!submitted) return false;

  const submittedNumber = numericValue(submitted);
  const candidates = acceptedValues(answer);

  for (const candidate of candidates) {
    const expected = normalizeText(candidate);
    if (!expected) continue;
    if (submitted === expected) return true;
    if (submitted.toLowerCase() === expected.toLowerCase()) return true;

    const expectedNumber = numericValue(expected);
    if (submittedNumber !== null && expectedNumber !== null) {
      if (Math.abs(submittedNumber - expectedNumber) < 1e-9) return true;
    }
  }
  return false;
}

export function gradeTextOrChoice(question, answer, response = {}) {
  if (!question || !answer) return false;

  if (question.type === "multiple_choice") {
    return Boolean(
      response.optionId &&
        String(answer.optionId) === String(response.optionId),
    );
  }

  if (question.type === "code_output" || question.type === "short_answer") {
    return matchesTextAnswer(answer, response.value);
  }

  return false;
}

/**
 * Build a small, safe description of what the learner submitted. Used in the
 * completed assessment report; never includes hidden test code.
 */
export function describeResponse(question, response = {}) {
  if (!question) return "";
  if (question.type === "multiple_choice") {
    const option = (question.options || []).find(
      (item) => String(item.id) === String(response.optionId),
    );
    return option?.text || "";
  }
  if (question.type === "code") {
    return typeof response.code === "string" ? response.code : "";
  }
  return typeof response.value === "string" ? response.value : "";
}
