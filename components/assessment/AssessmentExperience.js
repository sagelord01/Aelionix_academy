"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import AssessmentRunner from "./AssessmentRunner";
import AssessmentSummary from "./AssessmentSummary";
import { postJson } from "@/lib/client/request";
import styles from "./AssessmentExperience.module.css";

export default function AssessmentExperience({
  initialAttempt,
  initialSummary,
  executionAvailable,
  canPersist,
  hasHistory,
}) {
  const [attempt, setAttempt] = useState(initialAttempt || null);
  const [summary, setSummary] = useState(initialSummary || null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setStarting(true);
    setError("");
    try {
      const payload = await postJson("/api/assessment/start", {});
      setSummary(null);
      setAttempt({
        attemptId: payload.attemptId,
        title: payload.title,
        question: payload.question,
        progress: payload.progress,
        executionAvailable: payload.executionAvailable,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  }

  if (attempt) {
    return (
      <AssessmentRunner
        initialAttempt={attempt}
        executionAvailable={executionAvailable}
        onComplete={(result) => {
          setAttempt(null);
          setSummary(result);
        }}
      />
    );
  }

  if (summary) {
    return (
      <AssessmentSummary
        summary={summary}
        onRetake={canPersist ? start : undefined}
      />
    );
  }

  return (
    <section className={styles.intro}>
      <div className={styles.introCopy}>
        <Badge tone="neutral" dot>
          Up to 10 questions · adaptive
        </Badge>
        <h2 className={styles.title}>Find a careful starting point.</h2>
        <p className={styles.lede}>
          The check moves up or down in difficulty and favours concepts you have
          not seen. A practical Python question is offered only after five
          answered questions with at least 60% early accuracy and working
          execution.
        </p>
        <ul className={styles.rules}>
          <li>Nothing here grades you or locks content.</li>
          <li>Skipping is allowed and is recorded as a skip, not a guess.</li>
          <li>Correctness is revealed only after the check is completed.</li>
          <li>One answer is limited evidence; mastery needs more.</li>
        </ul>
      </div>

      <div className={styles.actionCard}>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {!canPersist ? (
          <Alert tone="warning" title="Assessment storage is not configured">
            Add SUPABASE_SERVICE_ROLE_KEY on the server to create an attempt.
            Without it, nothing can be saved, so the check is disabled.
          </Alert>
        ) : null}
        <Button
          type="button"
          size="lg"
          onClick={start}
          disabled={starting || !canPersist}
          icon={hasHistory ? RefreshCw : ArrowRight}
        >
          {starting
            ? "Creating attempt…"
            : hasHistory
              ? "Start a fresh check"
              : "Begin the starting check"}
        </Button>
        <p className={styles.small}>
          Starting creates a real attempt in your account. Existing incomplete
          attempts are closed as abandoned so the next question is never
          ambiguous.
        </p>
      </div>
    </section>
  );
}
