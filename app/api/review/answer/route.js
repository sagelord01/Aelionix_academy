import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { firstZodError, reviewAnswerSchema } from "@/lib/validation/schemas";
import { answerReviewItem, ReviewError } from "@/lib/review/service";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 20_000);
  if (body.error) return body.error;

  const parsed = reviewAnswerSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("invalid_request", firstZodError(parsed), 400);
  }

  const admin = getSupabaseAdmin();
  const rate = await enforceRateLimit({ admin, userId: auth.user.id, kind: "review" });
  if (!rate.allowed) {
    return apiError("rate_limited", rate.message, 429);
  }

  try {
    const payload = await answerReviewItem({
      admin,
      userId: auth.user.id,
      itemId: parsed.data.itemId,
      response: parsed.data.response,
      confidence: parsed.data.confidence,
      selfQuality: parsed.data.selfQuality,
    });
    return Response.json({ ok: true, ...payload }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof ReviewError) {
      return apiError(error.code, error.message, error.status);
    }
    logServerError("review/answer", error);
    return apiError(
      "review_failed",
      "That review answer could not be graded or saved. Try again.",
      500,
    );
  }
}
