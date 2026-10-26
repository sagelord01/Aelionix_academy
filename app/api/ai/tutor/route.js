import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getProfile } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { firstZodError, tutorRequestSchema } from "@/lib/validation/schemas";
import { sendTutorMessage, TutorError } from "@/lib/ai/tutor-service";
import { AiError } from "@/lib/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 80_000);
  if (body.error) return body.error;

  const parsed = tutorRequestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("invalid_request", firstZodError(parsed), 400);
  }

  try {
    const profile = await getProfile(auth.supabase, auth.user.id);
    if (!profile?.onboarding_completed) {
      return apiError(
        "onboarding_required",
        "Finish onboarding before using the tutor, so its context is accurate.",
        403,
      );
    }

    const payload = await sendTutorMessage({
      admin: getSupabaseAdmin(),
      userId: auth.user.id,
      input: parsed.data,
      profile,
    });

    return Response.json({ ok: true, ...payload }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof TutorError) {
      return apiError(error.code, error.message, error.status);
    }
    if (error instanceof AiError) {
      return apiError(error.code, error.message, error.status);
    }
    logServerError("ai/tutor", error);
    return apiError(
      "tutor_failed",
      "The tutor could not answer that message. Your message was saved where possible. Try again.",
      500,
    );
  }
}
