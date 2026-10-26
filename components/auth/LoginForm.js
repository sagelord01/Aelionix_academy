"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signInAction } from "@/lib/auth/actions";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import GoogleButton from "./GoogleButton";
import styles from "./AuthForms.module.css";

export default function LoginForm({ nextPath, notice, serverError, googleEnabled }) {
  const [state, formAction, pending] = useActionState(signInAction, {
    error: "",
    message: "",
  });

  return (
    <div className={styles.stack}>
      {serverError ? (
        <Alert tone="warning" title="Sign-in is not ready">
          {serverError}
        </Alert>
      ) : null}
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <form action={formAction} className={styles.form}>
        <input type="hidden" name="next" value={nextPath} />
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
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            disabled={pending}
          />
        </Field>
        <div className={styles.rowBetween}>
          <Link href="/forgot-password" className={styles.smallLink}>
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth disabled={pending} icon={ArrowRight}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <GoogleButton />
        </>
      ) : null}

      <p className={styles.switch}>
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </div>
  );
}
