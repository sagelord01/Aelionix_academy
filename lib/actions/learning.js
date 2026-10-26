"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { markLessonStarted, recordLearningEvent } from "@/lib/progress/record";
import {
  draftSchema,
  firstZodError,
  onboardingSchema,
} from "@/lib/validation/schemas";

export async function saveOnboardingAction(previousState, formData) {
  const { supabase, user } = await requireUser();

  const parsed = onboardingSchema.safeParse({
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

  const returning = formData.get("returnTo") === "dashboard";

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: parsed.data.displayName,
        learning_goal: parsed.data.learningGoal,
        experience_level: parsed.data.experienceLevel,
        preferred_mode: parsed.data.preferredMode,
        weekly_minutes: parsed.data.weeklyMinutes,
        hint_preference: parsed.data.hintPreference,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    return {
      error: "We could not save your preferences. Please try again.",
      message: "",
    };
  }

  const admin = getSupabaseAdmin();
  if (admin && !returning) {
    await recordLearningEvent(admin, {
      userId: user.id,
      kind: "onboarding_completed",
    });
  }

  revalidatePath("/", "layout");
  redirect(returning ? "/settings" : "/assessment");
}

export async function startLessonAction(lessonId) {
  const { user } = await requireUser();
  if (typeof lessonId !== "string") return { ok: false };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, reason: "storage_not_configured" };

  const { data: lesson, error } = await admin
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !lesson) return { ok: false, reason: "lesson_not_found" };

  try {
    await markLessonStarted({ admin, userId: user.id, lessonId });
    return { ok: true };
  } catch {
    return { ok: false, reason: "write_failed" };
  }
}

export async function saveDraftAction(input) {
  const { supabase, user } = await requireUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Draft could not be saved." };
  }

  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, lesson_id")
    .eq("id", parsed.data.exerciseId)
    .eq("is_published", true)
    .maybeSingle();

  if (!exercise) return { ok: false, message: "Exercise not found." };

  const { error } = await supabase.from("exercise_drafts").upsert(
    {
      user_id: user.id,
      exercise_id: exercise.id,
      code: parsed.data.code,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exercise_id" },
  );

  if (error) {
    return { ok: false, message: "Draft could not be saved." };
  }

  return { ok: true, savedAt: new Date().toISOString() };
}

export async function resetDraftAction(exerciseId) {
  const { supabase, user } = await requireUser();
  if (typeof exerciseId !== "string") return { ok: false };

  const { error } = await supabase
    .from("exercise_drafts")
    .delete()
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId);

  return error ? { ok: false } : { ok: true };
}

export async function updatePreferredModeAction(mode) {
  const { supabase, user } = await requireUser();
  if (mode !== "coach" && mode !== "partner") {
    return { ok: false, message: "Unknown learning mode." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_mode: mode, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, message: "Could not update the learning mode." };
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}
