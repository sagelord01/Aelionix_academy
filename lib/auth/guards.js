import { redirect } from "next/navigation";
import { createSupabaseServerClient, getAuthUser } from "@/lib/supabase/server";

export async function requireUser() {
  const { supabase, user, error } = await getAuthUser();

  if (!supabase) {
    redirect("/login?reason=supabase");
  }

  if (!user) {
    redirect("/login");
  }

  return { supabase, user, authError: error };
}

export async function getProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, experience_level, learning_goal, preferred_mode, weekly_minutes, hint_preference, onboarding_completed, preferences, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load profile: ${error.message}`);
  }
  return data;
}

export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  return { supabase, user, profile };
}

export async function requireOnboardedUser() {
  const { supabase, user, profile } = await requireProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return { supabase, user, profile };
}

export async function getOptionalUser() {
  const { user } = await getAuthUser();
  return user;
}

export async function requireSupabaseClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?reason=supabase");
  return supabase;
}
