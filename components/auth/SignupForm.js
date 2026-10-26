"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signUpAction } from "@/lib/auth/actions";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import GoogleButton from "./GoogleButton";
import styles from "./AuthForms.module.css";

export default function SignupForm({ googleEnabled }) {
  const [state, formAction, pending] = useActionState(signUpAction, {
    error: "",
    message: "",
  });

  return (
    <div className={styles.stack}>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <form action={formAction} className={styles.form}>
        <Field
          label="Display name"
          htmlFor="displayName"
          hint="Used in your workspace. You can change it later."
        >
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="Ada Lovelace"
            disabled={pending}
          />
        </Field>
        <Field label="Email" htmlFor="email">
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
        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters. Use a password you do not reuse elsewhere."
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Create a password"
            disabled={pending}
          />
        </Field>
        <Button type="submit" size="lg" fullWidth disabled={pending} icon={ArrowRight}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <GoogleButton label="Sign up with Google" />
        </>
      ) : null}

      <p className={styles.switch}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
