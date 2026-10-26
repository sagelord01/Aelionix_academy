import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { explorationSchema, firstZodError } from "@/lib/validation/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { recordLearningEvent } from "@/lib/progress/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 10_000);
  if (body.error) return body.error;

  const parsed = explorationSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("invalid_request", firstZodError(parsed), 400);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return apiError(
      "setup_required",
      "Explorations need SUPABASE_SERVICE_ROLE_KEY on the server. Nothing was created.",
      503,
    );
  }

  const rate = await enforceRateLimit({ admin, userId: auth.user.id, kind: "explore" });
  if (!rate.allowed) {
    return apiError("rate_limited", rate.message, 429);
  }

  try {
    const { data: session, error } = await admin
      .from("exploration_sessions")
      .insert({
        user_id: auth.user.id,
        topic: parsed.data.topic,
        language: "python",
        status: "active",
      })
      .select("id, topic, status, created_at")
      .single();

    if (error || !session) {
      return apiError(
        "exploration_write_failed",
        "The exploration could not be created.",
        500,
      );
    }

    await recordLearningEvent(admin, {
      userId: auth.user.id,
      kind: "exploration_started",
      metadata: { explorationSessionId: session.id, topic: session.topic },
    });

    return Response.json(
      { ok: true, session },
      { headers: noStoreHeaders() },
    );
  } catch (error) {
    logServerError("explore/create", error);
    return apiError(
      "exploration_failed",
      "The exploration could not be created. Try again.",
      500,
    );
  }
}
