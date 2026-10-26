import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import Alert from "@/components/ui/Alert";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const { supabase, user } = await getAuthUser();

  if (!supabase) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Authentication is not configured."
        description="The password reset cannot run until Supabase is configured."
      >
        <Alert tone="warning">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
          .env.local, then restart the server.
        </Alert>
      </AuthShell>
    );
  }

  if (!user) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="This recovery link is not active."
        description="Recovery links expire. Request a new one and open it in the same browser."
        footer={
          <>
            Return to <Link href="/login">sign in</Link>.
          </>
        }
      >
        <Alert tone="warning" title="No recovery session">
          This page needs a valid recovery session. Request a new link from the
          forgot-password page.
        </Alert>
        <p style={{ marginTop: "16px" }}>
          <Link href="/forgot-password" style={{ textDecoration: "underline" }}>
            Request a new recovery link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password."
      description={`Updating the password for ${user.email || "this account"}. You will be signed out afterward.`}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
