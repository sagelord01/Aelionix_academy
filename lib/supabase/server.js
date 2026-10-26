import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/config/env";

/**
 * Request-scoped Supabase client using the user's cookies and the public anon
 * key. RLS applies to every query made through this client.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the
          // session, so this is safe to ignore here.
        }
      },
    },
  });
}

export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { supabase: null, user: null, error: "supabase_not_configured" };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { supabase, user: null, error: error.message };
  }
  return { supabase, user: data.user ?? null, error: null };
}
