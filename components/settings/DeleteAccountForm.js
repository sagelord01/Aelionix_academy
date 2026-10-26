"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccountAction } from "@/lib/actions/account";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import styles from "./SettingsForms.module.css";

export default function DeleteAccountForm({ adminConfigured }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, {
    error: "",
    message: "",
  });

  return (
    <form action={formAction} className={styles.dangerForm}>
      <p className={styles.dangerLede}>
        Deleting the account removes the profile, progress, drafts, attempts,
        tutor messages, and review schedule owned by it. This cannot be undone.
      </p>

      {!adminConfigured ? (
        <Alert tone="warning" title="Deletion is unavailable">
          Account deletion needs SUPABASE_SERVICE_ROLE_KEY on the server. It is
          not configured, so nothing can be deleted from this screen.
        </Alert>
      ) : null}

      <div aria-live="polite">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      </div>

      <div className={styles.dangerFields}>
        <Field
          label="Confirm your password"
          htmlFor="deletePassword"
          hint="Required so a borrowed session cannot delete the account."
        >
          <Input
            id="deletePassword"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending || !adminConfigured}
          />
        </Field>
        <Field
          label="Type DELETE to confirm"
          htmlFor="deleteConfirmation"
          hint="The server checks this exact value."
        >
          <Input
            id="deleteConfirmation"
            name="confirmation"
            autoComplete="off"
            placeholder="DELETE"
            required
            pattern="DELETE"
            disabled={pending || !adminConfigured}
          />
        </Field>
      </div>

      <Button
        type="submit"
        variant="danger"
        icon={Trash2}
        disabled={pending || !adminConfigured}
      >
        {pending ? "Deleting…" : "Delete account permanently"}
      </Button>
    </form>
  );
}
