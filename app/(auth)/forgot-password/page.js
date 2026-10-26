import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Alert from "@/components/ui/Alert";
import { getIntegrationStatus } from "@/lib/config/env";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const status = getIntegrationStatus();

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password."
      description="Enter the email on your account. If it exists, a recovery link will be sent."
      footer={
        <>
          Need to start over? <Link href="/signup">Create an account</Link>.
        </>
      }
    >
      {!status.supabase.configured ? (
        <Alert tone="warning" title="Authentication is not configured">
          Password recovery cannot run until the Supabase URL and anon key are
          configured on the server.
        </Alert>
      ) : null}
      <ForgotPasswordForm />
    </AuthShell>
  );
}
