import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getProfile } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AssessmentError, startAssessmentAttempt } from "@/lib/assessment/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 10_000);
  if (body.error) return body.error;

  try {
    const profile = await getProfile(auth.supabase, auth.user.id);
    if (!profile?.onboarding_completed) {
      return apiError(
        "onboarding_required",
        "Finish onboarding before starting the check.",
        403,
      );
    }

    const snapshot = await startAssessmentAttempt(
      getSupabaseAdmin(),
      auth.user.id,
    );

    return Response.json(
      { ok: true, ...snapshot },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    if (error instanceof AssessmentError) {
      return apiError(error.code, error.message, error.status);
    }
    logServerError("assessment/start", error);
    return apiError(
      "assessment_start_failed",
      "The starting-point check could not begin. Try again.",
      500,
    );
  }
}
