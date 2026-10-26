"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { saveOnboardingAction } from "@/lib/actions/learning";
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
import styles from "./OnboardingForm.module.css";

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

export default function OnboardingForm({ profile }) {
  const [state, formAction, pending] = useActionState(saveOnboardingAction, {
    error: "",
    message: "",
  });

  return (
    <form action={formAction} className={styles.form}>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className={styles.section}>
        <p className={styles.sectionLabel}>01 — Identity</p>
        <Field
          label="What should the workspace call you?"
          htmlFor="displayName"
          hint="Your display name appears in the sidebar and tutor context."
        >
          <Input
            id="displayName"
            name="displayName"
            defaultValue={profile?.display_name || ""}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder="Ada"
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
          defaultValue={profile?.learning_goal || "general"}
          columns={2}
        />
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>03 — Starting point</p>
        <ChoiceGrid
          name="experienceLevel"
          label="How much programming experience do you have?"
          options={levelOptions}
          defaultValue={profile?.experience_level || "beginner"}
          columns={2}
        />
        <Field
          label="Time you can realistically give each week"
          htmlFor="weeklyMinutes"
          hint="This only shapes pacing suggestions. It is not a promise or a streak mechanic."
        >
          <Select
            id="weeklyMinutes"
            name="weeklyMinutes"
            defaultValue={String(profile?.weekly_minutes || 120)}
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
          label="How should the tutor work with you?"
          options={modeOptions}
          defaultValue={profile?.preferred_mode || "coach"}
          columns={1}
        />
        <ChoiceGrid
          name="hintPreference"
          label="When you are stuck, what helps most?"
          options={hintOptions}
          defaultValue={profile?.hint_preference || "balanced"}
          columns={3}
        />
        <p className={styles.note}>
          You can change these later in settings. The two tutor modes use
          genuinely different instructions and stay in separate conversations.
        </p>
      </div>

      <div className={styles.actions}>
        <Button type="submit" size="lg" disabled={pending} icon={ArrowRight}>
          {pending ? "Saving…" : "Continue to the starting check"}
        </Button>
        <p className={styles.actionNote}>
          Next you will answer up to 10 adaptive questions. The result is used
          to choose a starting point, not to grade you.
        </p>
      </div>
    </form>
  );
}
