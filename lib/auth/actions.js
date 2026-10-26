"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUrl, getSupabaseConfig } from "@/lib/config/env";
import { safeNextPath } from "@/lib/auth/paths";
import {
  firstZodError,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/schemas";

const SUPABASE_SETUP_MESSAGE =
  "Authentication is not configured yet. Add the Supabase URL and anon key to .env.local, then restart the app.";

function friendlyAuthError(message = "") {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email address before signing in. Check your inbox for the confirmation link.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with that email already exists. Sign in or reset your password.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (lower.includes("password should be")) {
    return "Choose a stronger password with at least 8 characters.";
  }
  if (lower.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  return "We could not complete that request. Please try again.";
}

export async function signInAction(previousState, formData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed), message: "" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE, message: "" };

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: friendlyAuthError(error.message), message: "" };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signUpAction(previousState, formData) {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed), message: "" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE, message: "" };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message), message: "" };
  }

  if (!data.session) {
    return {
      error: "",
      message:
        "Check your inbox to confirm your email address. After confirming, sign in to continue.",
    };
  }

  redirect("/onboarding");
}

export async function forgotPasswordAction(previousState, formData) {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed), message: "" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE, message: "" };

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getAppUrl()}/auth/callback?next=/auth/reset-password`,
    },
  );

  if (error && !error.message.toLowerCase().includes("rate limit")) {
    // Do not reveal whether an account exists.
    console.error("Password reset request failed:", error.message);
  }

  return {
    error: "",
    message:
      "If an account exists for that address, a password recovery link is on its way. Check your inbox and spam folder.",
  };
}

export async function resetPasswordAction(previousState, formData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed), message: "" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE, message: "" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "This recovery link has expired or is invalid. Request a new password reset email.",
      message: "",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: friendlyAuthError(error.message), message: "" };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function googleSignInAction() {
  const { googleAuth } = {
    googleAuth:
      (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH || "").toLowerCase() ===
      "true",
  };

  if (!googleAuth) {
    return {
      error:
        "Google sign-in is not enabled. Enable the Google provider in Supabase and set NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: SUPABASE_SETUP_MESSAGE };

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error || !data.url) {
    return {
      error:
        "Google sign-in could not start. Verify the provider is configured in Supabase.",
    };
  }

  redirect(data.url);
}

export async function getAuthSetupMessage() {
  const { configured } = getSupabaseConfig();
  return configured ? null : SUPABASE_SETUP_MESSAGE;
}
