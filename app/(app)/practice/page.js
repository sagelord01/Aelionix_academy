import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Code2,
  Dumbbell,
  RotateCcw,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getCurriculumOverview } from "@/lib/data/curriculum";
import {
  getExerciseProgressList,
  getRecentAttempts,
} from "@/lib/data/progress";
import { titleCase } from "@/lib/utils/format";
import styles from "./Practice.module.css";

export const metadata = { title: "Practice" };

const filters = [
  { value: "all", label: "All exercises" },
  { value: "todo", label: "Not passed" },
  { value: "done", label: "Passed" },
];

export default async function PracticePage({ searchParams }) {
  const query = await searchParams;
  const filter = ["all", "todo", "done"].includes(query?.filter)
    ? query.filter
    : "all";

  const { supabase, user } = await requireOnboardedUser();
  const [curriculum, exerciseProgress, recentAttempts] = await Promise.all([
    getCurriculumOverview(supabase),
    getExerciseProgressList(supabase, user.id),
    getRecentAttempts(supabase, user.id, 6),
  ]);

  const progressByExercise = new Map(
    exerciseProgress.map((item) => [item.exercise_id, item]),
  );
  const lessonById = new Map(
    curriculum.lessons.map((lesson) => [lesson.id, lesson]),
  );
  const allExercises = curriculum.lessons.flatMap((lesson) =>
    (lesson.exercises || []).map((exercise) => ({
      ...exercise,
      lesson,
      state: progressByExercise.get(exercise.id) || null,
      passed: progressByExercise.get(exercise.id)?.status === "passed",
    })),
  );
  const passedCount = allExercises.filter((exercise) => exercise.passed).length;
  const todoCount = allExercises.length - passedCount;

  const visible = allExercises.filter((exercise) => {
    if (filter === "todo") return !exercise.passed;
    if (filter === "done") return exercise.passed;
    return true;
  });

  const grouped = curriculum.lessons
    .map((lesson) => ({
      lesson,
      exercises: visible.filter((exercise) => exercise.lesson_id === lesson.id),
    }))
    .filter((group) => group.exercises.length > 0);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Practice"
        title="Every exercise, in one place."
        description="Revisit a specific problem without walking the whole lesson. A pass counts only when the isolated runner confirms it in a saved submission."
        actions={
          todoCount ? (
            <Button href="/learn" variant="secondary" icon={Code2}>
              Open the path
            </Button>
          ) : null
        }
      />

      {!curriculum.track || allExercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No published exercises"
          action={<Button href="/settings">Check setup</Button>}
        >
          <p>
            Apply the database migration and seed to load exercises. This page will
            not invent practice problems that are not in the database.
          </p>
        </EmptyState>
      ) : (
        <>
          <section className={styles.summary} aria-label="Practice summary">
            <div className={styles.summaryStat}>
              <span className={styles.summaryValue}>
                {passedCount}/{allExercises.length}
              </span>
              <span className={styles.summaryLabel}>Exercises passed</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryValue}>{todoCount}</span>
              <span className={styles.summaryLabel}>Still open</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryValue}>
                {recentAttempts.filter((attempt) => attempt.attempt_kind === "submit").length}
              </span>
              <span className={styles.summaryLabel}>Recent submissions</span>
            </div>
            <p className={styles.summaryNote}>
              Attempt counts include runs and submissions recorded by the server.
              Opening an editor does not count as practice.
            </p>
          </section>

          <div className={styles.toolbar}>
            <nav className={styles.filters} aria-label="Filter exercises">
              {filters.map((item) => (
                <Link
                  key={item.value}
                  href={item.value === "all" ? "/practice" : `/practice?filter=${item.value}`}
                  className={`${styles.filter} ${filter === item.value ? styles.filterActive : ""}`}
                  aria-current={filter === item.value ? "page" : undefined}
                >
                  {item.label}
                  <span className={styles.filterCount}>
                    {item.value === "all"
                      ? allExercises.length
                      : item.value === "todo"
                        ? todoCount
                        : passedCount}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {grouped.length ? (
            <div className={styles.groups}>
              {grouped.map(({ lesson, exercises }) => (
                <section key={lesson.id} className={styles.group}>
                  <div className={styles.groupHead}>
                    <div>
                      <p className={styles.groupNumber}>
                        Lesson {String(lesson.position).padStart(2, "0")}
                      </p>
                      <h2 className={styles.groupTitle}>
                        <Link href={`/learn/${lesson.slug}`}>{lesson.title}</Link>
                      </h2>
                    </div>
                    <span className={styles.groupMeta}>
                      {lesson.exercises.filter((exercise) => progressByExercise.get(exercise.id)?.status === "passed").length}
                      /{lesson.exercises.length} passed
                    </span>
                  </div>

                  <ul className={styles.exerciseList}>
                    {exercises.map((exercise) => (
                      <li key={exercise.id}>
                        <Link
                          href={`/learn/${lesson.slug}?exercise=${exercise.slug}`}
                          className={styles.exercise}
                        >
                          <span
                            className={`${styles.statusIcon} ${exercise.passed ? styles.passed : ""}`}
                            aria-hidden="true"
                          >
                            {exercise.passed ? (
                              <CheckCircle2 size={14} strokeWidth={2} />
                            ) : (
                              <Circle size={10} strokeWidth={2} />
                            )}
                          </span>
                          <span className={styles.exerciseBody}>
                            <span className={styles.exerciseTitle}>
                              {exercise.title}
                            </span>
                            <span className={styles.exerciseMeta}>
                              {titleCase(exercise.difficulty)} ·{" "}
                              {exercise.state?.attempts
                                ? `${exercise.state.attempts} ${
                                    exercise.state.attempts === 1 ? "attempt" : "attempts"
                                  }`
                                : "No attempts yet"}
                            </span>
                          </span>
                          <span className={styles.exerciseBadge}>
                            <Badge tone={exercise.passed ? "success" : "neutral"} dot>
                              {exercise.passed ? "Passed" : "Open"}
                            </Badge>
                          </span>
                          <ArrowRight
                            size={15}
                            strokeWidth={1.5}
                            className={styles.exerciseArrow}
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={filter === "done" ? RotateCcw : CheckCircle2}
              title={
                filter === "done"
                  ? "No exercises passed yet"
                  : "Every exercise is passed"
              }
            >
              <p>
                {filter === "done"
                  ? "Run and submit an exercise in a lesson workspace. A pass appears here only after the server records it."
                  : "Nothing is waiting in this filter. Use review to keep the concepts available, or explore a topic beyond the path."}
              </p>
              <Button
                href={filter === "done" ? "/learn" : "/review"}
                variant="secondary"
                icon={ArrowRight}
              >
                {filter === "done" ? "Open the curriculum" : "Open review"}
              </Button>
            </EmptyState>
          )}

          <p className={styles.footNote}>
            {lessonById.size} lessons · {allExercises.length} published exercises.
            Filters describe saved progress only.
          </p>
        </>
      )}
    </div>
  );
}
