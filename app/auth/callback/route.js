import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/paths";
import { getAppUrl } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request) {
  const appUrl = getAppUrl();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=oauth&reason=${encodeURIComponent(error)}`, appUrl),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", appUrl));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?reason=supabase", appUrl));
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=callback", appUrl));
  }

  return NextResponse.redirect(new URL(next, appUrl));
}
