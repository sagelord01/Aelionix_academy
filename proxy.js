import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/config/env";
import { isAuthPath, isProtectedPath } from "@/lib/auth/paths";

function withRefreshedCookies(target, source) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
  const { url, anonKey, configured } = getSupabaseConfig();

  if (!configured) {
    if (isProtectedPath(pathname)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "supabase");
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${request.nextUrl.search || ""}`;
    loginUrl.searchParams.set("next", nextPath);
    return withRefreshedCookies(NextResponse.redirect(loginUrl), response);
  }

  if (user && isAuthPath(pathname)) {
    return withRefreshedCookies(
      NextResponse.redirect(new URL("/dashboard", request.url)),
      response,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
