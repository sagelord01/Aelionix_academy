import Link from "next/link";
import { CheckCircle2, CircleSlash2, XCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import styles from "./AssessmentSummary.module.css";

function accuracyLabel(accuracy) {
  if (accuracy === null || accuracy === undefined) return "No scored answers";
  return `${accuracy}% accuracy`;
}

export default function AssessmentSummary({ summary, onRetake, showCta = true }) {
  if (!summary) return null;

  const questions = Array.isArray(summary.questions) ? summary.questions : [];
  const concepts = Array.isArray(summary.concepts) ? summary.concepts : [];

  return (
    <section className={styles.wrap} aria-labelledby="assessment-summary-title">
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <p className="eyebrow">Starting-point check</p>
          <h2 id="assessment-summary-title" className={styles.title}>
            {accuracyLabel(summary.accuracy)}
          </h2>
          <p className={styles.lede}>
            {summary.answered || 0} answered · {summary.correct || 0} correct ·{" "}
            {summary.skipped || 0} skipped. This is a starting point, not a
            grade. It becomes more accurate as you produce work.
          </p>
        </div>
        {showCta ? (
          <div className={styles.headActions}>
            <Button href="/learn" variant="primary">
              Open the curriculum
            </Button>
            {onRetake ? (
              <Button variant="ghost" onClick={onRetake}>
                Retake check
              </Button>
            ) : (
              <Button href="/assessment" variant="ghost">
                Assessment page
              </Button>
            )}
          </div>
        ) : null}
      </header>

      {concepts.length ? (
        <div className={styles.concepts}>
          {concepts.map((concept) => {
            const percent = concept.answered
              ? Math.round((concept.correct / concept.answered) * 100)
              : 0;
            return (
              <div key={concept.slug} className={styles.concept}>
                <div className={styles.conceptTop}>
                  <span className={styles.conceptName}>{concept.title}</span>
                  <span className={styles.conceptScore}>
                    {concept.correct}/{concept.answered || 0}
                  </span>
                </div>
                <div
                  className={styles.track}
                  role="img"
                  aria-label={`${concept.title}: ${percent}% correct on ${concept.answered || 0} answered`}
                >
                  <span
                    className={styles.fill}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {concept.skipped ? (
                  <span className={styles.skipped}>
                    {concept.skipped} skipped
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {questions.length ? (
        <div className={styles.questions}>
          {questions.map((question, index) => (
            <article key={`${index}-${question.prompt}`} className={styles.question}>
              <div className={styles.questionHead}>
                {question.skipped ? (
                  <CircleSlash2
                    size={16}
                    className={styles.skipIcon}
                    aria-label="Skipped"
                  />
                ) : question.isCorrect ? (
                  <CheckCircle2
                    size={16}
                    className={styles.correctIcon}
                    aria-label="Correct"
                  />
                ) : (
                  <XCircle
                    size={16}
                    className={styles.wrongIcon}
                    aria-label="Incorrect"
                  />
                )}
                <span className={styles.questionNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Badge tone="neutral">{question.concept || "General"}</Badge>
                {question.type === "code" ? (
                  <Badge tone="neutral">Practical</Badge>
                ) : null}
              </div>
              <p className={styles.prompt}>{question.prompt}</p>
              <div className={styles.answerRow}>
                <span className={styles.answerLabel}>Your response</span>
                <span className={styles.answerValue}>
                  {question.skipped
                    ? "Skipped"
                    : question.responseText || "No response recorded"}
                </span>
              </div>
              {question.explanation ? (
                <p className={styles.explanation}>{question.explanation}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <footer className={styles.foot}>
        <p>
          Concepts answered here now appear in your mastery and review record.
          A single correct answer is treated as limited evidence.
        </p>
        <Link href="/progress" className={styles.footLink}>
          Inspect the evidence record
        </Link>
      </footer>
    </section>
  );
}
