import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { assessmentCompleteSchema, firstZodError } from "@/lib/validation/schemas";
import { AssessmentError, completeAssessment } from "@/lib/assessment/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 10_000);
  if (body.error) return body.error;

  const parsed = assessmentCompleteSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("invalid_request", firstZodError(parsed), 400);
  }

  try {
    const payload = await completeAssessment({
      admin: getSupabaseAdmin(),
      userId: auth.user.id,
      attemptId: parsed.data.attemptId,
    });
    return Response.json(
      { ok: true, ...payload },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    if (error instanceof AssessmentError) {
      return apiError(error.code, error.message, error.status);
    }
    logServerError("assessment/complete", error);
    return apiError(
      "assessment_complete_failed",
      "The result could not be completed. Your answers are saved; try again.",
      500,
    );
  }
}
