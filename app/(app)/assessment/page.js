import PageHeader from "@/components/ui/PageHeader";
import Alert from "@/components/ui/Alert";
import AssessmentExperience from "@/components/assessment/AssessmentExperience";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAssessmentPageState } from "@/lib/assessment/service";
import { getExecutionConfig } from "@/lib/config/env";
import styles from "./Assessment.module.css";

export const metadata = { title: "Starting-point check" };

export default async function AssessmentPage() {
  const { supabase, user } = await requireOnboardedUser();
  const admin = getSupabaseAdmin();
  const state = await getAssessmentPageState({ supabase, admin, userId: user.id });

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Calibration"
        title="Starting-point check"
        description="A short adaptive check used to choose a sensible first lesson. It measures a starting point, not your worth or your ceiling."
      />

      {state.needsAdmin ? (
        <Alert tone="warning" title="An incomplete attempt cannot be resumed">
          The attempt exists, but its questions and answers are protected by the
          server-only service key. Add SUPABASE_SERVICE_ROLE_KEY to resume it.
          Nothing was lost.
        </Alert>
      ) : null}

      <AssessmentExperience
        initialAttempt={state.inProgress}
        initialSummary={state.completed?.summary || null}
        executionAvailable={getExecutionConfig().configured}
        canPersist={Boolean(admin)}
        hasHistory={Boolean(state.latest)}
      />

      <div className={styles.note}>
        <p>
          This check uses a transparent selection rule: difficulty moves one
          step after each answer, unseen concepts are preferred, and the
          practical question waits for early evidence. You can retake it, but
          each attempt is stored separately.
        </p>
      </div>
    </div>
  );
}
