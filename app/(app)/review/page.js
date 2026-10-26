import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Layers,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import ReviewRunner from "@/components/review/ReviewRunner";
import { requireOnboardedUser } from "@/lib/auth/guards";
import {
  getDueReviewItems,
  getReviewSummary,
  getUpcomingReviewItems,
} from "@/lib/data/review";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { relativeTime } from "@/lib/utils/format";
import styles from "./Review.module.css";

export const metadata = { title: "Review" };

export default async function ReviewPage() {
  const { supabase, user } = await requireOnboardedUser();
  const [dueItems, summary, upcoming] = await Promise.all([
    getDueReviewItems(supabase, user.id, 12),
    getReviewSummary(supabase, user.id),
    getUpcomingReviewItems(supabase, user.id, 6),
  ]);
  const adminConfigured = Boolean(getSupabaseAdmin());
  const recentCorrect = summary.recent.filter((attempt) => attempt.is_correct).length;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Spaced recall"
        title="Keep what you learned available."
        description="Cards are scheduled from actual evidence: a passing exercise, a graded answer, and how confidently you recalled it. Nothing here is a streak."
        actions={
          dueItems.length ? (
            <Badge tone="neutral" dot>
              {dueItems.length} due now
            </Badge>
          ) : null
        }
      />

      <section className={styles.stats} aria-label="Review summary">
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary.due}</span>
          <span className={styles.statLabel}>Due now</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary.total}</span>
          <span className={styles.statLabel}>Cards scheduled</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {summary.recent.length
              ? `${Math.round((recentCorrect / summary.recent.length) * 100)}%`
              : "—"}
          </span>
          <span className={styles.statLabel}>
            Last {summary.recent.length || 0} attempts correct
          </span>
        </div>
        <p className={styles.statNote}>
          A correct answer lengthens the interval; a wrong answer brings the card
          back sooner. Confidence adjusts the quality score, not the facts.
        </p>
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          {dueItems.length ? (
            adminConfigured ? (
              <ReviewRunner items={dueItems} totalScheduled={summary.total} />
            ) : (
              <Alert tone="warning" title="Review grading is unavailable">
                Answers are graded on the server with the protected answer keys, and
                that requires SUPABASE_SERVICE_ROLE_KEY. Nothing will be shown as
                correct or saved until it is configured.
              </Alert>
            )
          ) : (
            <EmptyState
              icon={summary.total ? CheckCircle2 : Layers}
              title={
                summary.total
                  ? "Nothing is due right now"
                  : "No review cards scheduled yet"
              }
              action={
                <Button href="/learn" variant="secondary" icon={ArrowRight}>
                  Open the curriculum
                </Button>
              }
            >
              <p>
                {summary.total
                  ? "The schedule is clear. Cards will return when their interval ends rather than on an arbitrary daily reset."
                  : "A passing exercise or a graded assessment answer schedules cards for the concepts involved. Review appears after that evidence exists."}
              </p>
            </EmptyState>
          )}
        </div>

        <aside className={styles.aside}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Coming up</h2>
              <CalendarClock size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            {upcoming.length ? (
              <ul className={styles.upcoming}>
                {upcoming.map((item) => (
                  <li key={item.id}>
                    <span className={styles.upcomingBody}>
                      <span className={styles.upcomingConcept}>
                        {item.concept?.title || "Concept"}
                      </span>
                      <span className={styles.upcomingPrompt}>
                        {item.card?.prompt}
                      </span>
                    </span>
                    <span className={styles.upcomingDue}>
                      {relativeTime(item.due_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.panelNote}>
                No future cards are scheduled. Pass an exercise or complete an
                assessment to create evidence.
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Recent recall</h2>
              <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            {summary.recent.length ? (
              <ul className={styles.recent}>
                {summary.recent.map((attempt) => (
                  <li key={attempt.id}>
                    <span
                      className={`${styles.recentDot} ${attempt.is_correct ? styles.recentCorrect : ""}`}
                      aria-hidden="true"
                    />
                    <span>{attempt.is_correct ? "Correct" : "Incorrect"}</span>
                    <span className={styles.recentTime}>
                      {relativeTime(attempt.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.panelNote}>
                No review attempts recorded yet. This list stays empty until you
                answer a card.
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Where cards come from</h2>
            <ul className={styles.rules}>
              <li>Passing a lesson exercise schedules its concepts.</li>
              <li>Assessment answers add or update concept evidence.</li>
              <li>
                <Link href="/progress">Progress</Link> shows the evidence behind
                each concept, not only completion.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
