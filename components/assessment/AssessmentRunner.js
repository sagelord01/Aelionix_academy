"use client";

import { useState } from "react";
import { ArrowRight, CircleSlash2, LoaderCircle, Play } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import CodeEditor from "@/components/workspace/CodeEditor";
import { postJson } from "@/lib/client/request";
import styles from "./AssessmentRunner.module.css";

const typeLabels = {
  multiple_choice: "Multiple choice",
  code_output: "Predict the output",
  short_answer: "Short answer",
  code: "Practical",
};

export default function AssessmentRunner({
  initialAttempt,
  executionAvailable,
  onComplete,
}) {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [question, setQuestion] = useState(initialAttempt.question);
  const [progress, setProgress] = useState(initialAttempt.progress);
  const [choice, setChoice] = useState("");
  const [value, setValue] = useState("");
  const [code, setCode] = useState(initialAttempt.question?.starterCode || "");
  const [pending, setPending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [canSkip, setCanSkip] = useState(false);

  function resetInputs(next) {
    setChoice("");
    setValue("");
    setCode(next?.starterCode || "");
    setError(null);
    setCanSkip(false);
  }

  function applySnapshot(snapshot) {
    setAttempt(snapshot);
    setProgress(snapshot.progress);
    setQuestion(snapshot.question);
    resetInputs(snapshot.question);
  }

  async function submit({ skip = false } = {}) {
    if (!question) return;

    if (!skip) {
      if (question.type === "multiple_choice" && !choice) {
        setError({ message: "Choose one option before continuing." });
        return;
      }
      if (
        (question.type === "code_output" || question.type === "short_answer") &&
        !value.trim()
      ) {
        setError({ message: "Write an answer before continuing, or skip the question." });
        return;
      }
      if (question.type === "code" && !code.trim()) {
        setError({ message: "Write a function before checking it, or skip the question." });
        return;
      }
    }

    setPending(true);
    setError(null);
    setCanSkip(false);

    try {
      const payload = await postJson("/api/assessment/answer", {
        attemptId: attempt.attemptId,
        questionId: question.id,
        skip,
        response:
          question.type === "multiple_choice"
            ? { optionId: choice }
            : question.type === "code"
              ? { code }
              : { value },
      });
      applySnapshot(payload);
    } catch (requestError) {
      setError({ message: requestError.message, code: requestError.code });
      setCanSkip(Boolean(requestError.payload?.error?.canSkip));
    } finally {
      setPending(false);
    }
  }

  async function finish() {
    setFinishing(true);
    setError(null);
    try {
      const payload = await postJson("/api/assessment/complete", {
        attemptId: attempt.attemptId,
      });
      onComplete(payload.summary, attempt.attemptId);
    } catch (requestError) {
      setError({ message: requestError.message, code: requestError.code });
    } finally {
      setFinishing(false);
    }
  }

  const isFinished = progress.finished || !question;
  const stepNumber = Math.min(progress.answered + (isFinished ? 0 : 1), progress.target);

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <div className={styles.topMeta}>
          <Badge tone="neutral" dot>
            Starting-point check
          </Badge>
          <span className={styles.counter}>
            {isFinished
              ? `${progress.answered} of ${progress.target} answered`
              : `Question ${stepNumber} of about ${progress.target}`}
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.target}
          aria-valuenow={progress.answered}
          aria-label="Assessment progress"
        >
          <span
            className={styles.progressFill}
            style={{ width: `${Math.round((progress.answered / progress.target) * 100)}%` }}
          />
        </div>
      </header>

      {!executionAvailable ? (
        <Alert tone="info" title="Practical execution is not configured">
          The practical Python question is excluded while isolated execution is
          unavailable. You can still complete the conceptual check.
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="error" title="That answer was not sent">
          {error.message}
          {canSkip ? " You can skip this question to continue." : ""}
        </Alert>
      ) : null}

      {isFinished ? (
        <section className={styles.finishCard}>
          <p className="eyebrow">Check complete</p>
          <h2 className={styles.finishTitle}>All responses are recorded.</h2>
          <p className={styles.lede}>
            Completing the check grades the answers you already submitted, adds
            concept evidence, and schedules your first reviews. Explanations are
            shown only after completion.
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              size="lg"
              onClick={finish}
              disabled={finishing}
              icon={ArrowRight}
            >
              {finishing ? "Completing…" : "See results and explanations"}
            </Button>
          </div>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="assessment-question">
          <div className={styles.questionMeta}>
            <Badge tone="neutral">{typeLabels[question.type] || question.type}</Badge>
            {question.conceptTitle ? (
              <span className={styles.concept}>{question.conceptTitle}</span>
            ) : null}
            <span className={styles.difficulty} aria-label={`Difficulty ${question.difficulty} of 3`}>
              Difficulty {question.difficulty}/3
            </span>
          </div>

          <h2 id="assessment-question" className={styles.prompt}>
            {question.prompt}
          </h2>

          <div className={styles.answerArea}>
            {question.type === "multiple_choice" ? (
              <fieldset className={styles.options}>
                <legend className="sr-only">Choose one answer</legend>
                {question.options.map((option) => (
                  <label key={option.id} className={styles.option}>
                    <input
                      type="radio"
                      name="assessment-option"
                      value={option.id}
                      checked={choice === option.id}
                      onChange={() => setChoice(option.id)}
                      disabled={pending}
                      className={styles.radio}
                    />
                    <span className={styles.optionBody}>
                      <span className={styles.optionKey}>{option.id}</span>
                      <span className={styles.optionText}>{option.text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : null}

            {question.type === "code_output" || question.type === "short_answer" ? (
              <Field
                label="Your answer"
                htmlFor="assessment-value"
                hint="Enter the exact output or a concise answer. Case and simple numeric equivalence are handled."
              >
                <Input
                  id="assessment-value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  disabled={pending}
                  autoComplete="off"
                  placeholder="Type your answer"
                />
              </Field>
            ) : null}

            {question.type === "code" ? (
              <div className={styles.editorWrap}>
                <div className={styles.editorLabel}>
                  <span>Python</span>
                  <span>Runs in an isolated sandbox</span>
                </div>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  height={280}
                  ariaLabel="Practical assessment code"
                />
              </div>
            ) : null}
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              onClick={() => submit({ skip: false })}
              disabled={pending}
              icon={question.type === "code" ? Play : ArrowRight}
            >
              {pending
                ? question.type === "code"
                  ? "Checking in the sandbox…"
                  : "Saving…"
                : question.type === "code"
                  ? "Check with tests"
                  : "Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => submit({ skip: true })}
              disabled={pending}
              icon={CircleSlash2}
            >
              Skip
            </Button>
          </div>

          <p className={styles.footNote}>
            Answers are graded on the server. Correctness is not revealed
            mid-check, so the next question is chosen from your actual evidence
            rather than a guess you can game.
          </p>
        </section>
      )}

      {pending && question?.type === "code" ? (
        <p className={styles.running} role="status">
          <LoaderCircle size={14} className={styles.spin} aria-hidden="true" />
          Sending your code to the isolated execution service. This can take a
          few seconds.
        </p>
      ) : null}
    </div>
  );
}
