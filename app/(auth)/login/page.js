import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/auth/paths";
import { getOptionalUser } from "@/lib/auth/guards";
import { getIntegrationStatus } from "@/lib/config/env";

export const metadata = { title: "Sign in" };

const SUPABASE_SETUP =
  "Authentication is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the server.";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params?.next);
  const status = getIntegrationStatus();
  const user = await getOptionalUser();

  if (user) redirect(nextPath);

  let notice = "";
  let serverError = "";

  if (!status.supabase.configured) serverError = SUPABASE_SETUP;
  if (params?.reset === "success") {
    notice = "Your password was updated. Sign in with the new password.";
  }
  if (params?.reason === "supabase" && !serverError) {
    serverError = SUPABASE_SETUP;
  }
  if (params?.error === "callback" || params?.error === "missing_code") {
    notice = "";
    serverError =
      "That sign-in link could not be completed. It may have expired. Try signing in again.";
  }
  if (params?.error === "oauth") {
    serverError =
      "The identity provider did not complete sign-in. Check the provider configuration in Supabase and try again.";
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Continue where your evidence left off."
      description="Sign in to your lessons, drafts, execution history, reviews, and mastery record."
      footer={
        <>
          Trouble signing in? Review the <Link href="/privacy">privacy policy</Link>{" "}
          or contact the workspace operator.
        </>
      }
    >
      <LoginForm
        nextPath={nextPath}
        notice={notice}
        serverError={serverError}
        googleEnabled={status.googleAuth}
      />
    </AuthShell>
  );
}
