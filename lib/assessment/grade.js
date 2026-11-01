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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(submitted, keyword) {
  const normalizedKeyword = normalizeText(keyword).toLowerCase();
  if (!normalizedKeyword) return false;
  if (normalizedKeyword.includes(" ")) {
    return submitted.includes(normalizedKeyword);
  }

  // Match the start of a word so "grade" does not match "upgrade". A small
  // suffix allowance lets "input" match "inputs" and "validate" match
  // "validation" without requiring exact inflection.
  const stem = normalizedKeyword.endsWith("e")
    ? normalizedKeyword.slice(0, -1)
    : normalizedKeyword;
  const suffix = normalizedKeyword.endsWith("e")
    ? "(?:e|es|ed|ing|ion|ions)?"
    : "(?:s|es|ed|ing|ion|ions)?";
  return new RegExp(
    `(?:^|[^a-z0-9])${escapeRegExp(stem)}${suffix}`,
    "i",
  ).test(submitted);
}

function matchesKeywordAnswer(answer, submitted) {
  const keywords = Array.isArray(answer.keywords)
    ? answer.keywords
        .filter((keyword) => typeof keyword === "string")
        .map((keyword) => normalizeText(keyword).toLowerCase())
        .filter(Boolean)
    : [];
  if (!keywords.length) return false;

  const minimum = Math.max(
    1,
    Number.isFinite(Number(answer.minMatches))
      ? Math.trunc(Number(answer.minMatches))
      : 1,
  );
  const matched = new Set();
  for (const keyword of new Set(keywords)) {
    if (keywordMatches(submitted, keyword)) matched.add(keyword);
  }
  return matched.size >= minimum;
}

export function matchesTextAnswer(answer, responseValue) {
  if (!answer) return false;
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

  return matchesKeywordAnswer(answer, submitted);
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
 * Build a safe, human-readable accepted answer for review feedback. Option ids
 * are resolved to their text so the client never receives a raw key object.
 */
export function describeAcceptedAnswer(question, answer = {}) {
  if (!answer) return "";
  if (typeof answer === "string") return answer;

  if (question?.type === "multiple_choice") {
    const options = Array.isArray(question.options) ? question.options : [];
    const match = options.find((option) => {
      if (typeof option === "string") return false;
      return String(option?.id) === String(answer.optionId);
    });
    if (match) {
      return String(match.text ?? match.label ?? "");
    }

    // Support option arrays that contain plain strings and use their index.
    const byIndex = options[Number(answer.optionId)];
    return typeof byIndex === "string" ? byIndex : "";
  }

  const values = acceptedValues(answer);
  if (values.length) return values.join(" / ");
  return Array.isArray(answer.keywords)
    ? answer.keywords.filter((item) => typeof item === "string").join(", ")
    : "";
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
