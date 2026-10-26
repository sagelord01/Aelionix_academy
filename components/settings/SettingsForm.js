"use client";

import { useActionState } from "react";
import { Check, LayoutDashboard } from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/account";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import {
  goalOptions,
  hintOptions,
  levelOptions,
  modeOptions,
  weeklyMinuteOptions,
} from "@/lib/learning/options";
import styles from "./SettingsForms.module.css";

function ChoiceGrid({ name, label, options, defaultValue, columns = 2 }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{label}</legend>
      <div className={`${styles.choices} ${columns === 3 ? styles.three : ""}`}>
        {options.map((option) => (
          <label key={option.value} className={styles.choice}>
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              className={styles.radio}
            />
            <span className={styles.choiceBody}>
              <span className={styles.choiceLabel}>{option.label}</span>
              <span className={styles.choiceHint}>{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function SettingsForm({ profile }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, {
    error: "",
    message: "",
  });

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.formHead}>
        <div>
          <h2 className={styles.formTitle}>Learning preferences</h2>
          <p className={styles.formLede}>
            These choices shape recommendations, pacing suggestions, and how the
            tutor talks to you. They never lock content.
          </p>
        </div>
        <Button href="/dashboard" variant="ghost" size="sm" icon={LayoutDashboard}>
          Dashboard
        </Button>
      </div>

      <div aria-live="polite">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {!state.error && state.message ? (
          <Alert tone="success">{state.message}</Alert>
        ) : null}
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>01 — Identity</p>
        <Field
          label="Display name"
          htmlFor="displayName"
          hint="Shown in the workspace and included in tutor context."
        >
          <Input
            id="displayName"
            name="displayName"
            defaultValue={profile.display_name || ""}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            disabled={pending}
          />
        </Field>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>02 — Direction</p>
        <ChoiceGrid
          name="learningGoal"
          label="Why are you learning to program?"
          options={goalOptions}
          defaultValue={profile.learning_goal}
        />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>03 — Starting point</p>
        <ChoiceGrid
          name="experienceLevel"
          label="How much programming experience do you have?"
          options={levelOptions}
          defaultValue={profile.experience_level}
        />
        <Field
          label="Time you can realistically give each week"
          htmlFor="weeklyMinutes"
          hint="Used for pacing suggestions only. This app does not run a streak counter."
        >
          <Select
            id="weeklyMinutes"
            name="weeklyMinutes"
            defaultValue={String(profile.weekly_minutes || 120)}
            disabled={pending}
          >
            {weeklyMinuteOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>04 — Tutor behaviour</p>
        <ChoiceGrid
          name="preferredMode"
          label="Default tutor mode"
          options={modeOptions}
          defaultValue={profile.preferred_mode}
          columns={1}
        />
        <ChoiceGrid
          name="hintPreference"
          label="When you are stuck, what helps most?"
          options={hintOptions}
          defaultValue={profile.hint_preference}
          columns={3}
        />
        <p className={styles.note}>
          The coach and partner use separate system prompts and separate
          conversations. Switching modes never relabels one conversation as the
          other.
        </p>
      </div>

      <div className={styles.actions}>
        <Button type="submit" disabled={pending} icon={Check}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <p className={styles.actionNote}>
          Saved values apply to new tutor turns and future recommendations.
        </p>
      </div>
    </form>
  );
}
