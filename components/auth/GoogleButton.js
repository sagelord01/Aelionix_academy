"use client";

import { useState, useTransition } from "react";
import { googleSignInAction } from "@/lib/auth/actions";
import Alert from "@/components/ui/Alert";
import styles from "./AuthForms.module.css";

export default function GoogleButton({ label = "Continue with Google" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className={styles.googleWrap}>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <button
        type="button"
        className={styles.google}
        disabled={pending}
        onClick={() => {
          setError("");
          startTransition(async () => {
            const result = await googleSignInAction();
            if (result?.error) setError(result.error);
          });
        }}
      >
        <span className={styles.googleMark} aria-hidden="true">
          G
        </span>
        <span>{pending ? "Opening Google…" : label}</span>
      </button>
    </div>
  );
}
