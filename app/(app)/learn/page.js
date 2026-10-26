import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  Clock3,
  LockKeyhole,
  Play,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getCurriculumOverview } from "@/lib/data/curriculum";
import { getLessonProgressList, getExerciseProgressList } from "@/lib/data/progress";
import {
  getLessonStatus,
  getPrerequisiteStatus,
  lessonProgressPercent,
} from "@/lib/learning/curriculum";
import { formatMinutes, titleCase } from "@/lib/utils/format";
import styles from "./Curriculum.module.css";

export const metadata = { title: "Curriculum" };

const statusLabel = {
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
};

export default async function CurriculumPage() {
  const { supabase, user } = await requireOnboardedUser();
  const [curriculum, lessonProgress, exerciseProgress] = await Promise.all([
    getCurriculumOverview(supabase),
    getLessonProgressList(supabase, user.id),
    getExerciseProgressList(supabase, user.id),
  ]);

  const progressByLessonId = new Map(
    lessonProgress.map((item) => [item.lesson_id, item]),
  );
  const passes = new Map(
    exerciseProgress
      .filter((item) => item.status === "passed")
      .map((item) => [item.exercise_id, true]),
  );

  const lessons = curriculum.lessons.map((lesson) => {
    const prerequisiteStatus = getPrerequisiteStatus(lesson, progressByLessonId);
    const missing = prerequisiteStatus.missing.map((item) => ({
      ...item,
      title:
        curriculum.lessons.find(
          (candidate) =>
            candidate.id === (item.id || item.prerequisite_lesson_id),
        )?.title || "the prerequisite lesson",
    }));
    return {
      ...lesson,
      computedStatus: getLessonStatus(lesson, progressByLessonId, passes),
      prerequisiteStatus: { ...prerequisiteStatus, missing },
      percent: lessonProgressPercent(lesson, exerciseProgress),
      passedCount: (lesson.exercises || []).filter((exercise) => passes.get(exercise.id))
        .length,
    };
  });

  const completed = lessons.filter((lesson) => lesson.computedStatus === "completed").length;
  const inProgress = lessons.filter(
    (lesson) => lesson.computedStatus === "in_progress",
  ).length;
  const next = lessons.find(
    (lesson) =>
      lesson.computedStatus === "in_progress" && lesson.prerequisiteStatus.satisfied,
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Python Foundations"
        title="The full path, in order."
        description="Twelve lessons, each with written explanation and real exercises. Prerequisites are visible, not hidden, and nothing is locked."
        actions={
          next ? (
            <Button href={`/learn/${next.slug}`} icon={Play}>
              Continue: {next.title}
            </Button>
          ) : (
            <Button href="/assessment" variant="ghost">
              Starting-point check
            </Button>
          )
        }
      />

      {!curriculum.track || lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No published curriculum is available"
          action={<Button href="/settings">Check setup</Button>}
        >
          <p>
            Apply the database migration and seed to load the Python path. This
            page will not invent lessons that do not exist in the database.
          </p>
        </EmptyState>
      ) : (
        <>
          <section className={styles.trackSummary}>
            <div className={styles.trackCopy}>
              <p className={styles.trackTitle}>{curriculum.track.title}</p>
              <p className={styles.trackLede}>{curriculum.track.description}</p>
            </div>
            <dl className={styles.trackMeta}>
              <div>
                <dt>Lessons</dt>
                <dd>
                  {completed}/{lessons.length} complete
                </dd>
              </div>
              <div>
                <dt>In progress</dt>
                <dd>{inProgress}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{titleCase(curriculum.track.language)}</dd>
              </div>
            </dl>
          </section>

          <ol className={styles.list}>
            {lessons.map((lesson, index) => {
              const isNext = next?.id === lesson.id;
              const prereqMissing = !lesson.prerequisiteStatus.satisfied;
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${lesson.slug}`}
                    className={`${styles.row} ${isNext ? styles.rowNext : ""}`}
                  >
                    <div className={styles.indexCol}>
                      <span className={styles.index}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`${styles.statusIcon} ${styles[lesson.computedStatus]}`}
                        aria-hidden="true"
                      >
                        {lesson.computedStatus === "completed" ? (
                          <Check size={13} strokeWidth={2} />
                        ) : lesson.computedStatus === "in_progress" ? (
                          <span className={styles.pulseDot} />
                        ) : (
                          <Circle size={9} strokeWidth={2} />
                        )}
                      </span>
                    </div>

                    <div className={styles.body}>
                      <div className={styles.titleRow}>
                        <h2 className={styles.title}>{lesson.title}</h2>
                        {isNext ? <Badge tone="neutral">Next up</Badge> : null}
                        <span className={styles.statusText}>
                          {statusLabel[lesson.computedStatus]}
                        </span>
                      </div>
                      <p className={styles.description}>{lesson.description}</p>

                      <div className={styles.metaRow}>
                        <span className={styles.metaItem}>
                          <Clock3 size={12} strokeWidth={1.6} aria-hidden="true" />
                          {formatMinutes(lesson.estimated_minutes)}
                        </span>
                        <span className={styles.metaItem}>
                          {lesson.exercises.length}{" "}
                          {lesson.exercises.length === 1 ? "exercise" : "exercises"}
                        </span>
                        <span className={styles.metaItem}>
                          {titleCase(lesson.difficulty)}
                        </span>
                        {lesson.concepts.slice(0, 3).map((concept) => (
                          <span key={concept.id} className={styles.concept}>
                            {concept.title}
                          </span>
                        ))}
                      </div>

                      {prereqMissing ? (
                        <p className={styles.prereq}>
                          <LockKeyhole size={12} strokeWidth={1.7} aria-hidden="true" />
                          Complete{" "}
                          {lesson.prerequisiteStatus.missing
                            .map((item) => item.title || "the prerequisite")
                            .join(", ")}{" "}
                          first for the smoothest path. You can still open this
                          lesson.
                        </p>
                      ) : null}

                      <div className={styles.progressRow}>
                        <div className={styles.track}>
                          <span
                            className={styles.fill}
                            style={{ width: `${lesson.percent}%` }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          {lesson.passedCount}/{lesson.exercises.length} exercises
                          passed
                        </span>
                      </div>
                    </div>

                    <span className={styles.arrow} aria-hidden="true">
                      <ArrowRight size={17} strokeWidth={1.5} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          <div className={styles.footNote}>
            <p>
              A lesson completes only when every published exercise has a
              persisted passing submission. Mastery is separate and requires
              repeated evidence, including practical success.
            </p>
            <Button href="/practice" variant="ghost" size="sm" icon={ArrowRight}>
              Practice exercises
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
