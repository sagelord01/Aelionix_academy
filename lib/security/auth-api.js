import "server-only";
import { apiError } from "@/lib/security/api";
import { getAuthUser } from "@/lib/supabase/server";

export async function requireApiUser() {
  const { supabase, user, error } = await getAuthUser();

  if (!supabase) {
    return {
      response: apiError(
        "supabase_not_configured",
        "Authentication is not configured. Add the Supabase URL and anon key on the server.",
        503,
      ),
    };
  }

  if (!user) {
    return {
      response: apiError(
        "not_authenticated",
        "Sign in again to continue. Your work in this tab has not been submitted.",
        401,
      ),
    };
  }

  return { supabase, user, error };
}

export function rateLimitResponse(message, retryAfterMs) {
  return Response.json(
    {
      ok: false,
      error: { code: "rate_limited", message },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((retryAfterMs || 60000) / 1000))),
        "Cache-Control": "no-store",
      },
    },
  );
}
