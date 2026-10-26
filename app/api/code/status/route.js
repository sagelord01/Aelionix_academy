import "server-only";
import { apiError, apiSuccess, logServerError, noStoreHeaders } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ExecutionError, getExecutionStatus } from "@/lib/execution/judge0";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return apiError("invalid_request", "A submission token is required.", 400);
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return apiError(
      "setup_required",
      "Submission status needs SUPABASE_SERVICE_ROLE_KEY so ownership can be verified.",
      503,
    );
  }

  const { data: ownedAttempt, error: ownershipError } = await admin
    .from("code_attempts")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("provider_submission_id", token)
    .maybeSingle();

  if (ownershipError) {
    logServerError("code/status ownership", ownershipError);
    return apiError("status_failed", "That submission could not be verified.", 500);
  }

  if (!ownedAttempt) {
    return apiError(
      "not_found",
      "No saved attempt belongs to this submission token.",
      404,
    );
  }

  try {
    const result = await getExecutionStatus(token);
    return apiSuccess(
      {
        result: {
          status: result.status,
          stdout: String(result.stdout || "").slice(0, 20000),
          stderr: String(result.stderr || "").slice(0, 12000),
          exitCode: result.exitCode ?? null,
          durationMs: result.durationMs ?? null,
          providerStatus: result.rawDescription || "",
          finished: result.finished,
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof ExecutionError) {
      return apiError(error.code, error.message, error.status);
    }
    logServerError("code/status", error);
    return apiError("execution_failed", "The submission status could not be checked.", 500);
  }
}
