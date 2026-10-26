import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  Layers,
  Target,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ActivityBars from "@/components/app/ActivityBars";
import IntegrationNotice from "@/components/app/IntegrationNotice";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getCurriculumOverview } from "@/lib/data/curriculum";
import {
  getActivitySeries,
  getAssessmentHistory,
  getConceptCatalog,
  getExerciseProgressList,
  getMastery,
  getProgressCounts,
  getRecentAttempts,
  getReviewAttempts,
} from "@/lib/data/progress";
import { getIntegrationStatus } from "@/lib/config/env";
import {
  MASTERY_LABELS,
  masteryTone,
} from "@/lib/progress/mastery";
import { describeExecutionStatus } from "@/lib/execution/normalize";
import {
  formatDate,
  formatDuration,
  relativeTime,
  titleCase,
} from "@/lib/utils/format";
import styles from "./Progress.module.css";

export const metadata = { title: "Progress" };

const STATUS_ORDER = [
  "ready_for_challenge",
  "demonstrated",
  "developing",
  "insufficient_evidence",
  "not_assessed",
];

function Stat({ label, value, note }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statNote}>{note}</span>
    </div>
  );
}

function PercentBar({ value, label }) {
  return (
    <div
      className={styles.track}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
    >
      <span className={styles.fill} style={{ width: `${value}%` }} />
    </div>
  );
}

export default async function ProgressPage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const integration = getIntegrationStatus();

  const [
    curriculum,
    concepts,
    mastery,
    counts,
    series,
    assessments,
    attempts,
    recall,
  ] = await Promise.all([
    getCurriculumOverview(supabase),
    getConceptCatalog(supabase),
    getMastery(supabase, user.id),
    getProgressCounts(supabase, user.id),
    getActivitySeries(supabase, user.id, 28),
    getAssessmentHistory(supabase, user.id, 8),
    getRecentAttempts(supabase, user.id, 18),
    getReviewAttempts(supabase, user.id, 10),
  ]);

  const lessons = curriculum.lessons;
  const totalExercises = lessons.reduce(
    (sum, lesson) => sum + (lesson.exercises?.length || 0),
    0,
  );
  const masteryByConcept = new Map(
    mastery.map((item) => [item.concept_id, item]),
  );

  const conceptRows = concepts
    .map((concept) => {
      const evidence = masteryByConcept.get(concept.id);
      const evidenceCount = Number(evidence?.evidence_count) || 0;
      const correctCount = Number(evidence?.correct_count) || 0;
      const practicalSuccesses = Number(evidence?.practical_successes) || 0;
      const status = evidence?.status || "not_assessed";
      return {
        ...concept,
        status,
        evidenceCount,
        correctCount,
        practicalSuccesses,
        accuracy:
          evidenceCount > 0
            ? Math.round((correctCount / evidenceCount) * 100)
            : null,
        lastEvidenceAt: evidence?.last_evidence_at || null,
      };
    })
    .sort((a, b) => {
      const rank = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (rank !== 0) return rank;
      return a.title.localeCompare(b.title);
    });

  const statusCounts = STATUS_ORDER.reduce((accumulator, status) => {
    accumulator[status] = conceptRows.filter((row) => row.status === status).length;
    return accumulator;
  }, {});

  const evidenced = conceptRows.filter((row) => row.evidenceCount > 0).length;
  const reviewAccuracy =
    counts.reviewAttempts > 0
      ? Math.round((counts.correctReviews / counts.reviewAttempts) * 100)
      : null;
  const practicalSuccesses = conceptRows.reduce(
    (sum, row) => sum + row.practicalSuccesses,
    0,
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Evidence"
        title="Progress is what you can show."
        description="Completion records where you have been. Mastery is derived from graded answers and passing attempts you actually produced — never from time spent or lessons opened."
        actions={
          <>
            <Button href="/practice" variant="secondary" icon={Code2}>
              Practice
            </Button>
            <Button href="/review" icon={Layers}>
              Review
            </Button>
          </>
        }
      />

      <IntegrationNotice status={integration} compact />

      <section className={styles.stats} aria-label="Progress totals">
        <Stat
          label="Lessons completed"
          value={`${counts.lessonsCompleted}/${lessons.length || 0}`}
          note="Every published exercise passed"
        />
        <Stat
          label="Exercises passed"
          value={`${counts.exercisesPassed}/${totalExercises}`}
          note="Persisted passing submissions"
        />
        <Stat
          label="Concepts with evidence"
          value={`${evidenced}/${concepts.length || 0}`}
          note={`${practicalSuccesses} practical success${practicalSuccesses === 1 ? "" : "es"} recorded`}
        />
        <Stat
          label="Recall accuracy"
          value={reviewAccuracy == null ? "—" : `${reviewAccuracy}%`}
          note={
            counts.reviewAttempts
              ? `${counts.correctReviews}/${counts.reviewAttempts} review answers correct`
              : "No review answers recorded yet"
          }
        />
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.panel} aria-labelledby="mastery-title">
            <div className={styles.panelHead}>
              <div>
                <h2 id="mastery-title" className={styles.panelTitle}>
                  Concept mastery
                </h2>
                <p className={styles.panelLede}>
                  One correct answer does not establish mastery. Status changes
                  only when the evidence below meets the published threshold.
                </p>
              </div>
              <Badge tone="neutral" dot>
                {evidenced} of {concepts.length} with evidence
              </Badge>
            </div>

            <div className={styles.statusLegend}>
              {STATUS_ORDER.map((status) => (
                <span key={status} className={styles.legendItem}>
                  <Badge tone={masteryTone(status)}>
                    {MASTERY_LABELS[status]}
                  </Badge>
                  <span className={styles.legendCount}>{statusCounts[status]}</span>
                </span>
              ))}
            </div>

            {conceptRows.length ? (
              <ul className={styles.masteryList}>
                {conceptRows.map((concept) => (
                  <li key={concept.id} className={styles.masteryRow}>
                    <div className={styles.masteryBody}>
                      <div className={styles.masteryTop}>
                        <span className={styles.masteryTitle}>{concept.title}</span>
                        <Badge tone={masteryTone(concept.status)} dot>
                          {MASTERY_LABELS[concept.status]}
                        </Badge>
                      </div>
                      <span className={styles.masteryDescription}>
                        {concept.description || "No description published."}
                      </span>
                      <div className={styles.masteryMeta}>
                        <span>
                          {concept.evidenceCount} evidence{" "}
                          {concept.evidenceCount === 1 ? "item" : "items"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {concept.correctCount} correct
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {concept.practicalSuccesses} practical
                        </span>
                        {concept.lastEvidenceAt ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>last {relativeTime(concept.lastEvidenceAt)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.masteryMeter}>
                      <span className={styles.meterValue}>
                        {concept.accuracy == null ? "—" : `${concept.accuracy}%`}
                      </span>
                      <PercentBar
                        value={concept.accuracy || 0}
                        label={`${concept.title} answer accuracy`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={Target}
                title="No concepts are published"
              >
                <p>
                  Apply the database migration and seed before progress can be
                  derived. The app does not invent concepts or mastery.
                </p>
              </EmptyState>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="assessment-title">
            <div className={styles.panelHead}>
              <div>
                <h2 id="assessment-title" className={styles.panelTitle}>
                  Starting-point checks
                </h2>
                <p className={styles.panelLede}>
                  Each completed check is kept with the summary produced from its
                  graded answers.
                </p>
              </div>
              <Link href="/assessment" className={styles.panelLink}>
                Open check <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {assessments.length ? (
              <ul className={styles.assessmentList}>
                {assessments.map((assessment) => {
                  const summary = assessment.summary || {};
                  return (
                    <li key={assessment.id} className={styles.assessmentRow}>
                      <div className={styles.assessmentBody}>
                        <div className={styles.assessmentTop}>
                          <span className={styles.assessmentTitle}>
                            {assessment.definition?.title || "Starting-point check"}
                          </span>
                          <Badge
                            tone={assessment.status === "completed" ? "success" : "warning"}
                            dot
                          >
                            {titleCase(assessment.status)}
                          </Badge>
                        </div>
                        <span className={styles.assessmentMeta}>
                          Started {formatDate(assessment.started_at)}
                          {assessment.completed_at
                            ? ` · Completed ${formatDate(assessment.completed_at)}`
                            : ""}
                        </span>
                        {assessment.status === "completed" ? (
                          <span className={styles.assessmentMeta}>
                            {summary.answered ?? 0} answered ·{" "}
                            {summary.correct ?? 0} correct ·{" "}
                            {summary.skipped ?? 0} skipped
                          </span>
                        ) : (
                          <span className={styles.assessmentMeta}>
                            This attempt has no completed summary yet.
                          </span>
                        )}
                      </div>
                      <div className={styles.assessmentScore}>
                        {summary.accuracy != null ? `${summary.accuracy}%` : "—"}
                        <span className={styles.assessmentScoreLabel}>accuracy</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState compact icon={Target} title="No check recorded yet">
                <p>
                  The adaptive check supplies the first evidence used for your
                  starting recommendation. Until then, recommendations are
                  explicitly provisional.
                </p>
                <Button href="/assessment" variant="secondary" size="sm">
                  Begin the check
                </Button>
              </EmptyState>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="attempts-title">
            <div className={styles.panelHead}>
              <div>
                <h2 id="attempts-title" className={styles.panelTitle}>
                  Recent code attempts
                </h2>
                <p className={styles.panelLede}>
                  Recorded by the server from the isolated execution provider.
                  {counts.codeAttempts
                    ? ` ${counts.submissions} of ${counts.codeAttempts} were graded submissions.`
                    : ""}
                </p>
              </div>
              <Link href="/practice" className={styles.panelLink}>
                Practice <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {attempts.length ? (
              <ul className={styles.attemptList}>
                {attempts.map((attempt) => (
                  <li key={attempt.id} className={styles.attemptRow}>
                    <span
                      className={`${styles.attemptDot} ${
                        attempt.is_successful ? styles.attemptPass : ""
                      }`}
                      aria-hidden="true"
                    />
                    <div className={styles.attemptBody}>
                      {attempt.lesson?.slug ? (
                        <Link
                          href={
                            attempt.exercise?.slug
                              ? `/learn/${attempt.lesson.slug}?exercise=${attempt.exercise.slug}`
                              : `/learn/${attempt.lesson.slug}`
                          }
                          className={styles.attemptTitle}
                        >
                          {attempt.exercise?.title ||
                            attempt.lesson?.title ||
                            "Exercise attempt"}
                        </Link>
                      ) : (
                        <span className={styles.attemptTitle}>
                          Free exploration
                        </span>
                      )}
                      <span className={styles.attemptMeta}>
                        {titleCase(attempt.attempt_kind)} ·{" "}
                        {describeExecutionStatus(attempt.execution_status)}
                        {attempt.duration_ms != null
                          ? ` · ${formatDuration(attempt.duration_ms)}`
                          : ""}
                      </span>
                    </div>
                    <span className={styles.attemptTime}>
                      {relativeTime(attempt.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Code2} title="No code attempts yet">
                <p>
                  A run is recorded only after the isolated service responds.
                  Unconfigured execution produces an explicit setup error, not a
                  simulated result.
                </p>
                <Button href="/explore" variant="secondary" size="sm" icon={Compass}>
                  Explore a topic
                </Button>
              </EmptyState>
            )}
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Recorded activity</h2>
              <span className={styles.mono}>{profile.weekly_minutes} min/week</span>
            </div>
            <ActivityBars series={series} label="Learning activity over 28 days" />
            <p className={styles.asideNote}>
              Activity counts recorded events only. Opening a page without a
              recorded action does not create evidence.
            </p>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Recent recall</h2>
              <Layers size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            {recall.length ? (
              <ul className={styles.recallList}>
                {recall.map((attempt) => (
                  <li key={attempt.id} className={styles.recallRow}>
                    <span
                      className={`${styles.recallDot} ${
                        attempt.is_correct ? styles.attemptPass : ""
                      }`}
                      aria-hidden="true"
                    />
                    <span className={styles.recallPrompt}>
                      {attempt.item?.card?.prompt || "Review card"}
                    </span>
                    <span className={styles.recallMeta}>
                      {attempt.confidence ? `${attempt.confidence} confidence` : "no confidence"}
                      {attempt.quality != null ? ` · q${attempt.quality}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.asideNote}>
                No recall attempts yet. A card is created when a concept has
                practical evidence, then scheduled by your answers.
              </p>
            )}
            <Link href="/review" className={styles.panelLink}>
              Open review <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>How status is decided</h2>
              <Target size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <ul className={styles.rules}>
              <li>Fewer than two evidence items: insufficient evidence.</li>
              <li>
                At least 70% correct and one practical success: demonstrated.
              </li>
              <li>
                At least 85% correct, four evidence items, and two practical
                successes: ready for a challenge.
              </li>
              <li>Everything else with evidence: developing.</li>
            </ul>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Completion is separate</h2>
              <BookOpen size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className={styles.asideNote}>
              A lesson is marked complete only after every published exercise has
              a passing submission. That says what you finished, not what you have
              retained. Review and recall keep the second question visible.
            </p>
            <div className={styles.rowActions}>
              <Button href="/learn" variant="ghost" size="sm">
                Curriculum
              </Button>
              <Button href="/review" variant="ghost" size="sm">
                Review
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
