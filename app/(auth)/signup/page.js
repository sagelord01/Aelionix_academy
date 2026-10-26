import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import Alert from "@/components/ui/Alert";
import { getOptionalUser } from "@/lib/auth/guards";
import { getIntegrationStatus } from "@/lib/config/env";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const status = getIntegrationStatus();
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell
      eyebrow="New account"
      title="Build a record you can trust."
      description="Start with a short onboarding, then an adaptive check that chooses a sensible first lesson."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>.
        </>
      }
    >
      {!status.supabase.configured ? (
        <Alert tone="warning" title="Authentication is not configured">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
          .env.local, then restart the server. Account creation will not work
          until then.
        </Alert>
      ) : null}
      <SignupForm googleEnabled={status.googleAuth} />
    </AuthShell>
  );
}
