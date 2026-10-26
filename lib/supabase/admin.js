import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/config/env";

let cachedClient = null;
let cachedKey = "";

/**
 * Privileged Supabase client. Never import this from a Client Component.
 * Every caller must authenticate the user and validate ownership before using
 * it to write data.
 */
export function getSupabaseAdmin() {
  const { url, serviceRoleKey, adminConfigured } = getSupabaseConfig();
  if (!adminConfigured) return null;

  const cacheKey = `${url}:${serviceRoleKey.slice(-12)}`;
  if (cachedClient && cachedKey === cacheKey) return cachedClient;

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "learning-workspace-server" },
    },
  });
  cachedKey = cacheKey;
  return cachedClient;
}
