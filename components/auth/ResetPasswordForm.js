"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/auth/actions";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import styles from "./AuthForms.module.css";

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, {
    error: "",
    message: "",
  });

  return (
    <div className={styles.stack}>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <form action={formAction} className={styles.form}>
        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
