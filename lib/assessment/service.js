import "server-only";
import {
  ASSESSMENT_TARGET,
  questionPublicShape,
  selectNextQuestion,
  summarizeAssessment,
} from "@/lib/assessment/engine";
import { describeResponse, gradeTextOrChoice } from "@/lib/assessment/grade";
import { getExecutionConfig } from "@/lib/config/env";
import { addConceptEvidence, recordLearningEvent, scheduleReviewCards } from "@/lib/progress/record";
import { executePython } from "@/lib/execution/judge0";

export class AssessmentError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "AssessmentError";
    this.code = code;
    this.status = status;
  }
}

const QUESTION_SELECT = `
  id, assessment_id, concept_id, key, type, difficulty, position, prompt,
  options, starter_code, is_published,
  concept:concepts(id, slug, title),
  key_data:assessment_question_keys(answer, explanation, self_assessed, optional_if_execution_unavailable)
`;

function mapQuestion(row) {
  const keyData = Array.isArray(row.key_data) ? row.key_data[0] : row.key_data;
  return {
    ...row,
    concept_slug: row.concept?.slug || null,
    concept_title: row.concept?.title || null,
    answer: keyData?.answer || null,
    explanation: keyData?.explanation || "",
    self_assessed: Boolean(keyData?.self_assessed),
    optional_if_execution_unavailable: Boolean(
      keyData?.optional_if_execution_unavailable,
    ),
  };
}

async function loadDefinition(admin) {
  const { data, error } = await admin
    .from("assessment_definitions")
    .select("id, slug, title, description")
    .eq("is_published", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AssessmentError(
      "assessment_read_failed",
      "The starting-point check could not be loaded.",
      500,
    );
  }
  if (!data) {
    throw new AssessmentError(
      "assessment_not_seeded",
      "No published assessment exists. Run the database seed before starting.",
      503,
    );
  }
  return data;
}

async function loadBundle(admin, userId, attemptId) {
  const { data: attempt, error: attemptError } = await admin
    .from("assessments")
    .select(
      "id, user_id, assessment_id, status, started_at, completed_at, summary, definition:assessment_definitions(id, slug, title, description)",
    )
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (attemptError) {
    throw new AssessmentError(
      "assessment_read_failed",
      "The assessment attempt could not be loaded.",
      500,
    );
  }
  if (!attempt) {
    throw new AssessmentError("attempt_not_found", "Assessment attempt not found.", 404);
  }

  const [questionResult, responseResult] = await Promise.all([
    admin
      .from("assessment_questions")
      .select(QUESTION_SELECT)
      .eq("assessment_id", attempt.assessment_id)
      .eq("is_published", true)
      .order("position"),
    admin
      .from("assessment_responses")
      .select("id, question_id, response, is_correct, skipped, created_at")
      .eq("assessment_id", attempt.id)
      .order("created_at"),
  ]);

  if (questionResult.error || responseResult.error) {
    throw new AssessmentError(
      "assessment_read_failed",
      "The assessment details could not be loaded.",
      500,
    );
  }

  return {
    attempt,
    questions: (questionResult.data || []).map(mapQuestion),
    responses: responseResult.data || [],
  };
}

function nextQuestionFor(bundle) {
  const answeredIds = bundle.responses.map((response) => response.question_id);
  const scored = bundle.responses.filter((response) => !response.skipped);
  const correctCount = scored.filter((response) => response.is_correct).length;
  const answeredCount = bundle.responses.length;

  const last = bundle.responses[bundle.responses.length - 1] || null;
  const lastQuestion = last
    ? bundle.questions.find((question) => question.id === last.question_id)
    : null;

  const executionAvailable = getExecutionConfig().configured;

  return selectNextQuestion({
    questions: bundle.questions,
    answeredQuestionIds: answeredIds,
    answeredCount,
    correctCount,
    lastDifficulty: lastQuestion?.difficulty || 1,
    lastCorrect: last && !last.skipped ? Boolean(last.is_correct) : null,
    executionAvailable,
    target: ASSESSMENT_TARGET,
  });
}

function snapshot(bundle) {
  const next = nextQuestionFor(bundle);
  const answered = bundle.responses.length;
  return {
    attemptId: bundle.attempt.id,
    title: bundle.attempt.definition?.title || "Starting-point check",
    status: bundle.attempt.status,
    question: next ? questionPublicShape(next) : null,
    progress: {
      answered,
      target: ASSESSMENT_TARGET,
      finished: !next,
    },
    executionAvailable: getExecutionConfig().configured,
  };
}

export async function startAssessmentAttempt(admin, userId) {
  if (!admin) {
    throw new AssessmentError(
      "setup_required",
      "Assessment progress needs SUPABASE_SERVICE_ROLE_KEY on the server, which is not configured. Nothing was started.",
      503,
    );
  }

  const definition = await loadDefinition(admin);

  const { error: abandonError } = await admin
    .from("assessments")
    .update({ status: "abandoned" })
    .eq("user_id", userId)
    .eq("status", "in_progress");

  if (abandonError) {
    throw new AssessmentError(
      "assessment_write_failed",
      "The previous attempt could not be closed.",
      500,
    );
  }

  const { data: attempt, error } = await admin
    .from("assessments")
    .insert({
      user_id: userId,
      assessment_id: definition.id,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error || !attempt) {
    throw new AssessmentError(
      "assessment_write_failed",
      "A new assessment attempt could not be created.",
      500,
    );
  }

  await recordLearningEvent(admin, {
    userId,
    kind: "assessment_started",
    metadata: { assessmentId: definition.id },
  });

  const bundle = await loadBundle(admin, userId, attempt.id);
  return snapshot(bundle);
}

export async function getAssessmentAttemptSnapshot(admin, userId, attemptId) {
  if (!admin) {
    throw new AssessmentError(
      "setup_required",
      "Assessment progress needs SUPABASE_SERVICE_ROLE_KEY on the server.",
      503,
    );
  }
  const bundle = await loadBundle(admin, userId, attemptId);
  if (bundle.attempt.status === "completed") {
    return {
      attemptId: bundle.attempt.id,
      status: "completed",
      summary: bundle.attempt.summary,
      progress: { answered: bundle.responses.length, target: ASSESSMENT_TARGET, finished: true },
      question: null,
      executionAvailable: getExecutionConfig().configured,
    };
  }
  return snapshot(bundle);
}

export async function getAssessmentPageState({ supabase, admin, userId }) {
  const { data: latest, error } = await supabase
    .from("assessments")
    .select(
      "id, status, started_at, completed_at, summary, definition:assessment_definitions(title, slug)",
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load assessment: ${error.message}`);
  }

  if (!latest) {
    return { latest: null, inProgress: null, completed: null, needsAdmin: false };
  }

  if (latest.status === "in_progress") {
    if (!admin) {
      return {
        latest,
        inProgress: null,
        completed: null,
        needsAdmin: true,
      };
    }
    const inProgress = await getAssessmentAttemptSnapshot(admin, userId, latest.id);
    return { latest, inProgress, completed: null, needsAdmin: false };
  }

  return {
    latest,
    inProgress: null,
    completed: latest.status === "completed" ? latest : null,
    needsAdmin: false,
  };
}

async function runCodeCheck(question, code) {
  if (!getExecutionConfig().configured) {
    throw new AssessmentError(
      "execution_not_configured",
      "The practical check cannot run because isolated code execution is not configured. You can skip this question.",
      503,
    );
  }

  const tests = Array.isArray(question.answer?.tests) ? question.answer.tests : [];
  if (!tests.length) {
    throw new AssessmentError(
      "assessment_invalid",
      "The practical question has no checks configured. You can skip it.",
      503,
    );
  }

  const result = await executePython({
    code,
    tests: tests.map((test, index) => ({
      name: test.name || `Check ${index + 1}`,
      code: test.code,
      hidden: false,
    })),
  });

  if (result.status === "processing") {
    throw new AssessmentError(
      "execution_processing",
      "The practical check is still running. Wait a moment and submit again.",
      409,
    );
  }

  function countPassed(list) {
    return Array.isArray(list)
      ? list.filter((item) => item && item.passed === true).length
      : 0;
  }

  return {
    correct: result.status === "success" && countPassed(result.tests) === tests.length,
    status: result.status,
    passed: countPassed(result.tests),
    total: tests.length,
  };
}

export async function submitAssessmentAnswer({
  admin,
  userId,
  attemptId,
  questionId,
  skip = false,
  response = {},
}) {
  if (!admin) {
    throw new AssessmentError(
      "setup_required",
      "Assessment answers need SUPABASE_SERVICE_ROLE_KEY on the server. Nothing was saved.",
      503,
    );
  }

  const bundle = await loadBundle(admin, userId, attemptId);
  if (bundle.attempt.status !== "in_progress") {
    throw new AssessmentError(
      "attempt_closed",
      "This assessment attempt is already closed.",
      409,
    );
  }

  const question = bundle.questions.find((item) => item.id === questionId);
  if (!question) {
    throw new AssessmentError(
      "question_not_found",
      "That question does not belong to this attempt.",
      404,
    );
  }

  let isCorrect = null;
  let storedResponse = response;

  if (skip) {
    storedResponse = {};
  } else if (question.type === "code") {
    const code = typeof response.code === "string" ? response.code.trim() : "";
    if (!code) {
      throw new AssessmentError(
        "missing_code",
        "Write a function before checking your answer, or skip this question.",
        400,
      );
    }
    const check = await runCodeCheck(question, response.code);
    isCorrect = check.correct;
    storedResponse = {
      code: response.code,
      executionStatus: check.status,
      testsPassed: check.passed,
      testsTotal: check.total,
    };
  } else {
    isCorrect = gradeTextOrChoice(question, question.answer, response);
    const rawValue = response.value;
    storedResponse =
      question.type === "multiple_choice"
        ? { optionId: response.optionId || null }
        : { value: typeof rawValue === "string" ? rawValue.slice(0, 5000) : "" };
  }

  const { error } = await admin.from("assessment_responses").upsert(
    {
      assessment_id: attemptId,
      question_id: questionId,
      response: storedResponse,
      is_correct: isCorrect,
      skipped: Boolean(skip),
    },
    { onConflict: "assessment_id,question_id" },
  );

  if (error) {
    throw new AssessmentError(
      "assessment_write_failed",
      "Your answer could not be saved. Try again.",
      500,
    );
  }

  const updated = await loadBundle(admin, userId, attemptId);
  return snapshot(updated);
}

export async function completeAssessment({ admin, userId, attemptId }) {
  if (!admin) {
    throw new AssessmentError(
      "setup_required",
      "Completing the assessment needs SUPABASE_SERVICE_ROLE_KEY on the server.",
      503,
    );
  }

  const bundle = await loadBundle(admin, userId, attemptId);
  if (bundle.attempt.status === "completed") {
    return { summary: bundle.attempt.summary, alreadyCompleted: true };
  }
  if (bundle.attempt.status !== "in_progress") {
    throw new AssessmentError("attempt_closed", "This attempt is closed.", 409);
  }

  const next = nextQuestionFor(bundle);
  if (next) {
    throw new AssessmentError(
      "assessment_incomplete",
      "Answer or skip the remaining question before completing the check.",
      409,
    );
  }

  const summaryBase = summarizeAssessment(
    bundle.responses,
    bundle.questions,
    bundle.questions.map((question) => question.answer).filter(Boolean),
  );

  const questionDetails = bundle.responses.map((response) => {
    const question = bundle.questions.find((item) => item.id === response.question_id);
    if (!question) return null;
    return {
      prompt: question.prompt,
      type: question.type,
      concept: question.concept_title || "General",
      isCorrect: Boolean(response.is_correct),
      skipped: Boolean(response.skipped),
      responseText: describeResponse(question, response.response || {}).slice(0, 1200),
      explanation: (question.explanation || "").slice(0, 1200),
    };
  }).filter(Boolean);

  const summary = {
    ...summaryBase,
    questions: questionDetails,
    completedAt: new Date().toISOString(),
  };

  const { error } = await admin
    .from("assessments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      summary,
    })
    .eq("id", attemptId)
    .eq("user_id", userId);

  if (error) {
    throw new AssessmentError(
      "assessment_write_failed",
      "The assessment result could not be saved.",
      500,
    );
  }

  const evidence = bundle.responses
    .map((response) => {
      const question = bundle.questions.find((item) => item.id === response.question_id);
      if (!question?.concept_id || response.skipped) return null;
      return {
        conceptId: question.concept_id,
        correct: Boolean(response.is_correct),
        practical: question.type === "code" && Boolean(response.is_correct),
      };
    })
    .filter(Boolean);

  if (evidence.length) {
    await addConceptEvidence(admin, userId, evidence);
  }

  const concepts = [];
  const seen = new Set();
  for (const question of bundle.questions) {
    if (!question.concept_id || seen.has(question.concept_id)) continue;
    if (!bundle.responses.some((response) => response.question_id === question.id)) continue;
    seen.add(question.concept_id);
    concepts.push({
      id: question.concept_id,
      title: question.concept_title,
    });
  }

  if (concepts.length) {
    await scheduleReviewCards({ admin, userId, lessonId: null, concepts });
  }

  await recordLearningEvent(admin, {
    userId,
    kind: "assessment_completed",
    metadata: {
      answered: summaryBase.answered,
      correct: summaryBase.correct,
      accuracy: summaryBase.accuracy,
    },
  });

  return { summary, alreadyCompleted: false };
}
