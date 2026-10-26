"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  deleteAccountSchema,
  firstZodError,
  settingsSchema,
} from "@/lib/validation/schemas";

export async function saveSettingsAction(previousState, formData) {
  const { supabase, user } = await requireUser();
  const parsed = settingsSchema.safeParse({
    displayName: formData.get("displayName"),
    learningGoal: formData.get("learningGoal"),
    experienceLevel: formData.get("experienceLevel"),
    preferredMode: formData.get("preferredMode"),
    weeklyMinutes: formData.get("weeklyMinutes"),
    hintPreference: formData.get("hintPreference"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed), message: "" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      learning_goal: parsed.data.learningGoal,
      experience_level: parsed.data.experienceLevel,
      preferred_mode: parsed.data.preferredMode,
      weekly_minutes: parsed.data.weeklyMinutes,
      hint_preference: parsed.data.hintPreference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Your settings could not be saved. Try again.", message: "" };
  }

  revalidatePath("/", "layout");
  return { error: "", message: "Settings saved." };
}

export async function deleteAccountAction(previousState, formData) {
  const { supabase, user } = await requireUser();

  const parsed = deleteAccountSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed), message: "" };
  }

  if (!user.email) {
    return {
      error: "This account has no email address available for verification.",
      message: "",
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      error:
        "Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the server. It is not configured, so nothing was deleted.",
      message: "",
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });

  if (verifyError) {
    return { error: "The password is incorrect. Nothing was deleted.", message: "" };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return {
      error:
        "The account could not be deleted. Nothing was changed. Contact the operator if this persists.",
      message: "",
    };
  }

  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
