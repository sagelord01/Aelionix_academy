import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assessmentAnswerSchema, firstZodError } from "@/lib/validation/schemas";
import { AssessmentError, submitAssessmentAnswer } from "@/lib/assessment/service";
import { ExecutionError } from "@/lib/execution/judge0";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 80_000);
  if (body.error) return body.error;

  const parsed = assessmentAnswerSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("invalid_request", firstZodError(parsed), 400);
  }

  const admin = getSupabaseAdmin();
  const rate = await enforceRateLimit({ admin, userId: auth.user.id, kind: "assessment" });
  if (!rate.allowed) {
    return apiError("rate_limited", rate.message, 429);
  }

  try {
    const snapshot = await submitAssessmentAnswer({
      admin,
      userId: auth.user.id,
      attemptId: parsed.data.attemptId,
      questionId: parsed.data.questionId,
      skip: parsed.data.skip,
      response: parsed.data.response,
    });

    return Response.json(
      { ok: true, ...snapshot },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    if (error instanceof AssessmentError) {
      return apiError(error.code, error.message, error.status);
    }
    if (error instanceof ExecutionError) {
      return apiError(error.code, error.message, error.status, {
        canSkip: true,
      });
    }
    logServerError("assessment/answer", error);
    return apiError(
      "assessment_answer_failed",
      "That answer could not be saved or checked. Your text is still in the form. Try again.",
      500,
    );
  }
}
