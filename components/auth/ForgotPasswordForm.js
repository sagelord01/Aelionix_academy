"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { forgotPasswordAction } from "@/lib/auth/actions";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import styles from "./AuthForms.module.css";

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, {
    error: "",
    message: "",
  });

  return (
    <div className={styles.stack}>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <form action={formAction} className={styles.form}>
        <Field
          label="Email"
          htmlFor="email"
          hint="We will send a recovery link if an account exists. This page never reveals whether it does."
        >
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            disabled={pending}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth disabled={pending} icon={ArrowRight}>
          {pending ? "Sending…" : "Send recovery link"}
        </Button>
      </form>

      <p className={styles.switch}>
        Remembered it? <Link href="/login">Return to sign in</Link>
      </p>
    </div>
  );
}
