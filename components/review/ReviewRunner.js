"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RichText from "@/components/ui/RichText";
import { postJson } from "@/lib/client/request";
import { relativeTime } from "@/lib/utils/format";
import styles from "./ReviewRunner.module.css";

const typeLabels = {
  multiple_choice: "Multiple choice",
  code_output: "Predict the output",
  short_answer: "Short answer",
};

function normalizeOptions(options) {
  return (Array.isArray(options) ? options : []).map((option, index) => {
    if (typeof option === "string") {
      return { id: String(index), text: option };
    }
    return {
      id: String(option?.id ?? index),
      text: String(option?.text ?? option?.label ?? ""),
    };
  });
}

export default function ReviewRunner({ items, totalScheduled }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState("medium");
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const item = items[index];
  const options = useMemo(
    () => (item ? normalizeOptions(item.card?.options) : []),
    [item],
  );
  const complete = index >= items.length;

  function resetInput() {
    setSelected("");
    setValue("");
    setConfidence("medium");
    setResult(null);
    setError("");
  }

  async function submit() {
    if (!item || pending) return;
    const type = item.card.type;
    const response =
      type === "multiple_choice" ? { optionId: selected } : { value };

    if (type === "multiple_choice" && !selected) {
      setError("Choose an answer before submitting.");
      return;
    }
    if (type !== "multiple_choice" && !value.trim()) {
      setError("Write an answer before submitting.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const payload = await postJson("/api/review/answer", {
        itemId: item.id,
        response,
        confidence,
      });
      setResult(payload);
      setAnswers((current) => [
        ...current,
        { itemId: item.id, correct: payload.isCorrect },
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  function next() {
    resetInput();
    setIndex((current) => current + 1);
  }

  if (!items.length) return null;

  if (complete) {
    const correct = answers.filter((answer) => answer.correct).length;
    return (
      <section className={styles.done}>
        <span className={styles.doneIcon} aria-hidden="true">
          <CheckCircle2 size={22} strokeWidth={1.5} />
        </span>
        <h2 className={styles.doneTitle}>This review session is finished.</h2>
        <p className={styles.doneLede}>
          {correct} of {answers.length} recalled correctly. Each answer has its own
          next due date; a wrong answer comes back sooner, not as punishment.
        </p>
        <div className={styles.doneStats}>
          <div>
            <span>{correct}</span>
            <p>Correct</p>
          </div>
          <div>
            <span>{answers.length - correct}</span>
            <p>To revisit</p>
          </div>
          <div>
            <span>{totalScheduled}</span>
            <p>Cards scheduled</p>
          </div>
        </div>
        <div className={styles.doneActions}>
          <Button
            icon={RefreshCw}
            onClick={() => {
              setIndex(0);
              setAnswers([]);
              resetInput();
              router.refresh();
            }}
          >
            Refresh due queue
          </Button>
          <Button href="/dashboard" variant="ghost" icon={ArrowRight}>
            Back to dashboard
          </Button>
        </div>
        <p className={styles.doneNote}>
          If more cards became due while you reviewed, refreshing loads the current
          server schedule. No card is marked correct without a saved attempt.
        </p>
      </section>
    );
  }

  const type = item.card.type;

  return (
    <section className={styles.runner} aria-labelledby="review-prompt">
      <div className={styles.top}>
        <div className={styles.counter}>
          <span>
            {index + 1}/{items.length}
          </span>
          <span className={styles.counterLabel}>due now</span>
        </div>
        <div className={styles.track} aria-hidden="true">
          <span
            className={styles.fill}
            style={{ width: `${(index / items.length) * 100}%` }}
          />
        </div>
        <Badge tone="neutral">{typeLabels[type] || type}</Badge>
      </div>

      <div className={styles.card}>
        <div className={styles.cardMeta}>
          <span>{item.concept?.title || "Concept"}</span>
          <span className={styles.cardDue}>
            was due {relativeTime(item.due_at)}
          </span>
          {item.repetitions ? (
            <span className={styles.cardReps}>
              {item.repetitions} prior{" "}
              {item.repetitions === 1 ? "review" : "reviews"}
            </span>
          ) : null}
        </div>

        <div
          id="review-prompt"
          className={styles.prompt}
          role="heading"
          aria-level={2}
        >
          <RichText text={item.card.prompt} />
        </div>

        {type === "multiple_choice" ? (
          <fieldset className={styles.options} disabled={Boolean(result) || pending}>
            <legend className="sr-only">Choose one answer</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className={`${styles.option} ${selected === option.id ? styles.optionSelected : ""}`}
              >
                <input
                  type="radio"
                  name="review-option"
                  value={option.id}
                  checked={selected === option.id}
                  onChange={(event) => setSelected(event.target.value)}
                  className={styles.radio}
                />
                <span className={styles.optionText}>{option.text}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <div className={styles.answerField}>
            <label htmlFor="review-value" className={styles.label}>
              {type === "code_output" ? "Exact output" : "Your answer"}
            </label>
            <textarea
              id="review-value"
              rows={type === "code_output" ? 4 : 3}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={styles.textarea}
              placeholder={
                type === "code_output"
                  ? "Type what Python prints, line by line"
                  : "Answer in a few words"
              }
              disabled={Boolean(result) || pending}
            />
          </div>
        )}

        <fieldset className={styles.confidence} disabled={Boolean(result) || pending}>
          <legend className={styles.label}>How sure are you?</legend>
          <div className={styles.confidenceRow}>
            {[
              { value: "low", label: "Guessing" },
              { value: "medium", label: "Fairly sure" },
              { value: "high", label: "Certain" },
            ].map((option) => (
              <label
                key={option.value}
                className={`${styles.confidenceOption} ${confidence === option.value ? styles.confidenceActive : ""}`}
              >
                <input
                  type="radio"
                  name="confidence"
                  value={option.value}
                  checked={confidence === option.value}
                  onChange={(event) => setConfidence(event.target.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {result ? (
          <div
            className={`${styles.result} ${result.isCorrect ? styles.correct : styles.incorrect}`}
            role="status"
          >
            <div className={styles.resultHead}>
              {result.isCorrect ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <XCircle size={16} aria-hidden="true" />
              )}
              <p>{result.isCorrect ? "Correct" : "Not quite"}</p>
              <Badge tone={result.isCorrect ? "success" : "warning"}>
                quality {result.quality}/5
              </Badge>
            </div>
            {result.explanation ? (
              <RichText
                text={result.explanation}
                className={styles.explanation}
              />
            ) : (
              <p className={styles.explanation}>
                This card has no explanation recorded.
              </p>
            )}
            {!result.isCorrect && result.acceptableAnswer ? (
              <p className={styles.acceptable}>
                Accepted answer: <strong>{result.acceptableAnswer}</strong>
              </p>
            ) : null}
            <p className={styles.nextDue}>
              Next review {relativeTime(result.nextDueAt)} · interval{" "}
              {result.intervalDays} {result.intervalDays === 1 ? "day" : "days"}
            </p>
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        {result ? (
          <Button icon={ArrowRight} onClick={next}>
            {index + 1 === items.length ? "Finish session" : "Next card"}
          </Button>
        ) : (
          <Button onClick={submit} disabled={pending}>
            {pending ? "Checking…" : "Check answer"}
          </Button>
        )}
        <span className={styles.actionsNote}>
          <RotateCcw size={11} aria-hidden="true" />
          Answers are graded on the server. The key is not sent to this page.
        </span>
      </div>
    </section>
  );
}
