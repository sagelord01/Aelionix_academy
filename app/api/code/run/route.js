import "server-only";
import { apiError, logServerError, noStoreHeaders, readJson } from "@/lib/security/api";
import { requireApiUser } from "@/lib/security/auth-api";
import { codeRunSchema, firstZodError } from "@/lib/validation/schemas";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CodeRunError, runLearnerCode } from "@/lib/execution/service";
import { ExecutionError } from "@/lib/execution/judge0";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const body = await readJson(request, 60_000);
  if (body.error) return body.error;

  const parsed = codeRunSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError("invalid_request", firstZodError(parsed), 400);
  }

  try {
    const payload = await runLearnerCode({
      admin: getSupabaseAdmin(),
      userId: auth.user.id,
      input: parsed.data,
    });
    return Response.json({ ok: true, ...payload }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof CodeRunError) {
      return apiError(error.code, error.message, error.status);
    }
    if (error instanceof ExecutionError) {
      return apiError(error.code, error.message, error.status);
    }
    logServerError("code/run", error);
    return apiError(
      "execution_failed",
      "The code could not be run. Your draft is preserved locally. Try again.",
      500,
    );
  }
}

export function GET() {
  return apiError("method_not_allowed", "Use POST to run code.", 405);
}
