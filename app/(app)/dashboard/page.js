import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  Compass,
  Layers,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ActivityBars from "@/components/app/ActivityBars";
import IntegrationNotice from "@/components/app/IntegrationNotice";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getCurriculumForDashboard } from "@/lib/data/curriculum";
import {
  getActivitySeries,
  getDashboardStats,
  getLessonProgressList,
  getExerciseProgressList,
  getMastery,
  getRecentActivity,
} from "@/lib/data/progress";
import { getDueReviewItems } from "@/lib/data/review";
import { getIntegrationStatus } from "@/lib/config/env";
import {
  getLessonStatus,
  getPrerequisiteStatus,
  lessonProgressPercent,
  reasonForRecommendation,
} from "@/lib/learning/curriculum";
import { activityLabel, formatMinutes, relativeTime, titleCase } from "@/lib/utils/format";
import styles from "./Dashboard.module.css";

export const metadata = { title: "Dashboard" };

function DashboardStat({ icon: Icon, label, value, note, href }) {
  const body = (
    <>
      <span className={styles.statIcon} aria-hidden="true">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
      {note ? <span className={styles.statNote}>{note}</span> : null}
    </>
  );

  return href ? (
    <Link href={href} className={styles.stat}>
      {body}
    </Link>
  ) : (
    <div className={styles.stat}>{body}</div>
  );
}

export default async function DashboardPage() {
  const { supabase, user, profile } = await requireOnboardedUser();
  const integration = getIntegrationStatus();

  const [
    curriculum,
    lessonProgress,
    exerciseProgress,
    stats,
    activity,
    mastery,
    series,
    dueItems,
  ] = await Promise.all([
    getCurriculumForDashboard(supabase),
    getLessonProgressList(supabase, user.id),
    getExerciseProgressList(supabase, user.id),
    getDashboardStats(supabase, user.id),
    getRecentActivity(supabase, user.id, 6),
    getMastery(supabase, user.id),
    getActivitySeries(supabase, user.id, 28),
    getDueReviewItems(supabase, user.id, 4),
  ]);

  const progressByLessonId = new Map(
    lessonProgress.map((item) => [item.lesson_id, item]),
  );
  const passedExerciseIds = new Set(
    exerciseProgress
      .filter((item) => item.status === "passed")
      .map((item) => item.exercise_id),
  );
  const exercisePasses = new Map(
    [...passedExerciseIds].map((id) => [id, true]),
  );
  const masteryByConcept = new Map(
    mastery.map((item) => [item.concept?.slug, item]),
  );
  const assessmentCompleted = Boolean(stats.lastAssessment);
  const assessmentSummary = stats.lastAssessment?.summary || null;

  const lessons = curriculum.lessons;
  const totalExercises = lessons.reduce(
    (sum, lesson) => sum + (lesson.exercises?.length || 0),
    0,
  );
  const totalPassed = lessons.reduce(
    (sum, lesson) =>
      sum +
      (lesson.exercises || []).filter((exercise) =>
        passedExerciseIds.has(exercise.id),
      ).length,
    0,
  );

  const withStatus = lessons.map((lesson) => ({
    ...lesson,
    computedStatus: getLessonStatus(lesson, progressByLessonId, exercisePasses),
    prerequisiteStatus: getPrerequisiteStatus(lesson, progressByLessonId),
  }));

  const eligible = withStatus.filter(
    (lesson) =>
      lesson.computedStatus !== "completed" && lesson.prerequisiteStatus.satisfied,
  );
  const recommended =
    eligible.find((lesson) => lesson.computedStatus === "in_progress") ||
    eligible[0] ||
    null;

  const recommendationReason = recommended
    ? reasonForRecommendation({
        lesson: recommended,
        profile,
        progress: progressByLessonId.get(recommended.id),
        masteryByConcept,
        assessmentCompleted,
      })
    : "";

  const recommendedPercent = recommended
    ? lessonProgressPercent(recommended, exerciseProgress)
    : 0;

  const dueCount = stats.dueReviews;
  const completedLessons = stats.completedLessons;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome back, ${profile.display_name || "learner"}.`}
        description={
          assessmentCompleted
            ? "The recommendation below is based on real answers, attempts, and mastery evidence."
            : "Your recommendation is provisional until you complete the starting-point check."
        }
        actions={
          <>
            {recommended ? (
              <Button href={`/learn/${recommended.slug}`} icon={Play}>
                {recommended.computedStatus === "in_progress"
                  ? "Continue lesson"
                  : "Start recommended lesson"}
              </Button>
            ) : null}
            <Button href="/review" variant="ghost" icon={Layers}>
              Review{dueCount ? ` · ${dueCount} due` : ""}
            </Button>
          </>
        }
      />

      <IntegrationNotice status={integration} compact />

      {!curriculum.track || lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="The curriculum is not loaded"
          action={<Button href="/settings">Check setup</Button>}
        >
          <p>
            Authentication can work before the database is seeded, but there are
            no published lessons to show. Apply the migration and seed in
            Supabase, then reload. The app will not invent a curriculum.
          </p>
        </EmptyState>
      ) : (
        <>
          <div className={styles.stats}>
            <DashboardStat
              icon={BookOpen}
              label="Lessons completed"
              value={`${completedLessons}/${lessons.length}`}
              note={
                completedLessons === 0
                  ? "Pass every exercise to complete a lesson"
                  : `${Math.round((completedLessons / lessons.length) * 100)}% of the path`
              }
              href="/learn"
            />
            <DashboardStat
              icon={CheckCircle2}
              label="Exercises passed"
              value={`${totalPassed}/${totalExercises}`}
              note="Persisted passing attempts only"
              href="/practice"
            />
            <DashboardStat
              icon={Layers}
              label="Reviews due"
              value={dueCount}
              note={dueCount ? "Schedule set by prior recall" : "Nothing scheduled yet"}
              href="/review"
            />
            <DashboardStat
              icon={Code2}
              label="Code attempts"
              value={stats.codeAttempts}
              note="Runs and submissions recorded"
              href="/progress"
            />
          </div>

          <div className={styles.grid}>
            <section className={styles.mainCol}>
              {recommended ? (
                <article className={styles.recommendation}>
                  <div className={styles.recommendationHead}>
                    <div className={styles.recommendationMeta}>
                      <Badge tone="neutral" dot>
                        Recommended next
                      </Badge>
                      <span className={styles.metaText}>
                        Lesson {recommended.position} ·{" "}
                        {titleCase(recommended.difficulty)} ·{" "}
                        {formatMinutes(recommended.estimated_minutes)}
                      </span>
                    </div>
                    <span className={styles.recommendationNumber} aria-hidden="true">
                      {String(recommended.position).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className={styles.recommendationTitle}>{recommended.title}</h2>
                  <p className={styles.recommendationLede}>
                    {recommended.description}
                  </p>

                  <div className={styles.reason}>
                    <Sparkles size={15} strokeWidth={1.6} aria-hidden="true" />
                    <p>{recommendationReason}</p>
                  </div>

                  <div className={styles.concepts}>
                    {recommended.concepts.map((concept) => (
                      <Badge key={concept.id} tone="neutral">
                        {concept.title}
                      </Badge>
                    ))}
                  </div>

                  <div className={styles.recommendationFoot}>
                    <div className={styles.progressBlock}>
                      <div className={styles.progressLabel}>
                        <span>
                          {recommendedPercent}% of this lesson&apos;s exercises passed
                        </span>
                        <span>
                          {recommended.exercises.filter((exercise) =>
                            passedExerciseIds.has(exercise.id),
                          ).length}
                          /{recommended.exercises.length}
                        </span>
                      </div>
                      <div
                        className={styles.track}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={recommendedPercent}
                        aria-label="Lesson exercise progress"
                      >
                        <span
                          className={styles.fill}
                          style={{ width: `${recommendedPercent}%` }}
                        />
                      </div>
                    </div>
                    <Button href={`/learn/${recommended.slug}`} icon={ArrowRight}>
                      Open workspace
                    </Button>
                  </div>
                </article>
              ) : (
                <article className={styles.recommendation}>
                  <Badge tone="success" dot>
                    Path complete
                  </Badge>
                  <h2 className={styles.recommendationTitle}>
                    Every published lesson is complete.
                  </h2>
                  <p className={styles.recommendationLede}>
                    Completion is not mastery. Use review and progress to inspect
                    where the evidence is thin, then explore a topic you cannot
                    yet explain.
                  </p>
                  <div className={styles.recommendationFoot}>
                    <div className={styles.rowActions}>
                      <Button href="/progress" variant="secondary">
                        Inspect evidence
                      </Button>
                      <Button href="/explore" icon={Compass}>
                        Explore a topic
                      </Button>
                    </div>
                  </div>
                </article>
              )}

              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <h2 className={styles.panelTitle}>Learning activity</h2>
                    <p className={styles.panelLede}>
                      Events recorded by the server over the last 28 days.
                    </p>
                  </div>
                  <Link href="/progress" className={styles.panelLink}>
                    Full evidence <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
                <ActivityBars series={series} label="Learning activity" />
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <h2 className={styles.panelTitle}>Recent activity</h2>
                    <p className={styles.panelLede}>
                      The latest recorded learning events.
                    </p>
                  </div>
                </div>
                {activity.length ? (
                  <ol className={styles.activityList}>
                    {activity.map((event) => (
                      <li key={event.id} className={styles.activityItem}>
                        <span className={styles.activityDot} aria-hidden="true" />
                        <div className={styles.activityBody}>
                          <span className={styles.activityTitle}>
                            {activityLabel(event.kind)}
                          </span>
                          {event.lesson ? (
                            <Link
                              href={`/learn/${event.lesson.slug}`}
                              className={styles.activityLink}
                            >
                              {event.lesson.title}
                            </Link>
                          ) : (
                            <span className={styles.activityMuted}>
                              No lesson attached
                            </span>
                          )}
                        </div>
                        <time
                          className={styles.activityTime}
                          dateTime={event.created_at}
                        >
                          {relativeTime(event.created_at)}
                        </time>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState
                    compact
                    icon={Clock3}
                    title="No activity recorded yet"
                  >
                    <p>
                      Opening a lesson, running code, or completing a review will
                      appear here. Nothing is simulated.
                    </p>
                  </EmptyState>
                )}
              </article>
            </section>

            <aside className={styles.sideCol}>
              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2 className={styles.panelTitle}>Starting-point check</h2>
                  <Badge tone={assessmentCompleted ? "success" : "warning"} dot>
                    {assessmentCompleted ? "Completed" : "Not completed"}
                  </Badge>
                </div>
                {assessmentCompleted ? (
                  <div className={styles.assessmentBody}>
                    <p className={styles.assessmentScore}>
                      {assessmentSummary?.accuracy != null
                        ? `${assessmentSummary.accuracy}% accuracy`
                        : "Completed"}
                    </p>
                    <p className={styles.panelLede}>
                      {assessmentSummary?.answered || 0} answered ·{" "}
                      {assessmentSummary?.correct || 0} correct ·{" "}
                      {assessmentSummary?.skipped || 0} skipped.
                    </p>
                    <Link href="/assessment" className={styles.panelLink}>
                      Inspect the result <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div className={styles.assessmentBody}>
                    <p className={styles.panelLede}>
                      Take the adaptive check so the recommendation and tutor
                      context have a real starting point.
                    </p>
                    <Button href="/assessment" variant="secondary" size="sm">
                      Begin check
                    </Button>
                  </div>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2 className={styles.panelTitle}>Due for recall</h2>
                  <Badge tone={dueCount ? "neutral" : "success"} dot>
                    {dueCount ? `${dueCount} due` : "Clear"}
                  </Badge>
                </div>
                {dueItems.length ? (
                  <ul className={styles.dueList}>
                    {dueItems.map((item) => (
                      <li key={item.id}>
                        <span className={styles.dueConcept}>
                          {item.concept?.title || "Concept"}
                        </span>
                        <span className={styles.dueWhen}>
                          {relativeTime(item.due_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.panelLede}>
                    Reviews are scheduled after passing exercises or completing
                    the check. If nothing is due, there is nothing to catch up on.
                  </p>
                )}
                <Link href="/review" className={styles.panelLink}>
                  Open review <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2 className={styles.panelTitle}>Tutor mode</h2>
                  <Badge tone="neutral">
                    {profile.preferred_mode === "partner"
                      ? "Coding Partner"
                      : "Coach"}
                  </Badge>
                </div>
                <p className={styles.panelLede}>
                  {profile.preferred_mode === "partner"
                    ? "The partner explains directly, plans with you, and may suggest code when asked."
                    : "The coach uses progressive hints and questions, withholding full solutions until you have tried."}
                </p>
                <Link href="/settings" className={styles.panelLink}>
                  Change mode <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <h2 className={styles.panelTitle}>This week</h2>
                  <Target size={16} className={styles.panelIcon} aria-hidden="true" />
                </div>
                <p className={styles.weekly}>
                  {formatMinutes(profile.weekly_minutes)} planned
                </p>
                <p className={styles.panelLede}>
                  A pacing preference, not a streak counter. The workspace does
                  not claim time you did not record.
                </p>
              </article>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
