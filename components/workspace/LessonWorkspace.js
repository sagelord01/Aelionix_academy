"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Eraser,
  FlaskConical,
  Lightbulb,
  Play,
  Sparkles,
  Terminal,
} from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import RichText from "@/components/ui/RichText";
import Spinner from "@/components/ui/Spinner";
import CodeEditor from "@/components/workspace/CodeEditor";
import ExecutionResult, {
  normalizeAttempt,
} from "@/components/workspace/ExecutionResult";
import TutorPanel from "@/components/tutor/TutorPanel";
import { saveDraftAction, startLessonAction } from "@/lib/actions/learning";
import { postJson } from "@/lib/client/request";
import { formatMinutes, titleCase } from "@/lib/utils/format";
import styles from "./LessonWorkspace.module.css";

const exerciseStatusLabel = {
  passed: "Passed",
  attempted: "Attempted",
  not_started: "Not started",
};

const statusIcons = {
  passed: Check,
  attempted: Circle,
  not_started: Circle,
};

function LessonContent({ content }) {
  if (!content || (!content.intro && !content.sections?.length)) {
    return (
      <p className={styles.missingContent}>
        This lesson has no published reading content yet. The exercises below are
        still available.
      </p>
    );
  }

  return (
    <div className={styles.prose}>
      {content.intro ? (
        <p className={styles.intro}>{content.intro}</p>
      ) : null}

      {(content.sections || []).map((section, index) => (
        <section key={`${section.title}-${index}`} className={styles.contentSection}>
          <h2 className={styles.contentHeading}>
            <span className={styles.contentIndex} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            {section.title}
          </h2>
          {(section.paragraphs || []).map((paragraph, paragraphIndex) => (
            <RichText
              key={paragraphIndex}
              text={paragraph}
              className={styles.paragraph}
            />
          ))}
          {section.code ? (
            <pre className={styles.contentCode}>
              <code>{section.code}</code>
            </pre>
          ) : null}
        </section>
      ))}

      {content.keyPoints?.length ? (
        <aside className={styles.keyPoints}>
          <p className={styles.keyPointsTitle}>Keep these in mind</p>
          <ul>
            {content.keyPoints.map((point) => (
              <li key={point}>
                <Check size={13} strokeWidth={2} aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </div>
  );
}

export default function LessonWorkspace({
  lesson,
  siblings,
  initialExerciseId,
  lessonProgress,
  exerciseProgress,
  drafts,
  lastAttempts,
  prerequisites,
  tutor,
  preferredMode,
  executionAvailable,
  aiConfigured,
  progressPersistence,
  canRunPlayground,
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    initialExerciseId || lesson.exercises[0]?.id || null,
  );
  const [codeMap, setCodeMap] = useState(() =>
    Object.fromEntries(
      lesson.exercises.map((exercise) => [
        exercise.id,
        drafts[exercise.id] ?? exercise.starter_code ?? "",
      ]),
    ),
  );
  const [results, setResults] = useState(() =>
    Object.fromEntries(
      lesson.exercises
        .map((exercise) => [exercise.id, normalizeAttempt(lastAttempts[exercise.id])])
        .filter(([, value]) => value),
    ),
  );
  const [exerciseStates, setExerciseStates] = useState(() =>
    Object.fromEntries(
      lesson.exercises.map((exercise) => [
        exercise.id,
        exerciseProgress[exercise.id] || {
          status: "not_started",
          attempts: 0,
        },
      ]),
    ),
  );
  const [status, setStatus] = useState(lessonProgress?.status || "not_started");
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saveState, setSaveState] = useState("saved");
  const [hintCounts, setHintCounts] = useState({});
  const saveTimer = useRef(null);
  const codeRef = useRef(codeMap);
  const selectedRef = useRef(selectedId);
  const dirtyRef = useRef(false);

  const selected = lesson.exercises.find((exercise) => exercise.id === selectedId);
  const code = (selected && codeMap[selected.id]) || "";
  const result = selected ? results[selected.id] : null;
  const exerciseState = selected
    ? exerciseStates[selected.id] || { status: "not_started", attempts: 0 }
    : null;
  const passedCount = lesson.exercises.filter(
    (exercise) => exerciseStates[exercise.id]?.status === "passed",
  ).length;
  const percent = lesson.exercises.length
    ? Math.round((passedCount / lesson.exercises.length) * 100)
    : 0;
  const currentIndex = siblings.findIndex((item) => item.slug === lesson.slug);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? siblings[currentIndex + 1] : null;

  useEffect(() => {
    codeRef.current = codeMap;
    selectedRef.current = selectedId;
  }, [codeMap, selectedId]);

  useEffect(() => {
    if (!progressPersistence || status !== "not_started") return;
    let cancelled = false;
    startLessonAction(lesson.id).then((response) => {
      if (cancelled) return;
      if (response?.ok) {
        setStatus("in_progress");
      } else {
        setNotice({
          tone: "warning",
          title: "This visit was not recorded",
          body:
            response?.reason === "storage_not_configured"
              ? "SUPABASE_SERVICE_ROLE_KEY is missing, so lesson progress cannot be saved. Your code drafts still save through your own account."
              : "The lesson could not be marked as started. Your work is still available, but progress may not update.",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id, progressPersistence, status]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirtyRef.current && selectedRef.current) {
        const latestCode = codeRef.current[selectedRef.current] || "";
        saveDraftAction({
          exerciseId: selectedRef.current,
          code: latestCode,
        }).catch(() => {});
      }
    },
    [],
  );

  async function flushDraft(exerciseId, value) {
    if (!exerciseId) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveState("saving");
    const response = await saveDraftAction({ exerciseId, code: value });
    setSaveState(response?.ok ? "saved" : "error");
    dirtyRef.current = false;
  }

  function updateCode(value) {
    if (!selected) return;
    setCodeMap((current) => ({ ...current, [selected.id]: value }));
    setSaveState("unsaved");
    dirtyRef.current = true;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const response = await saveDraftAction({
        exerciseId: selected.id,
        code: value,
      });
      setSaveState(response?.ok ? "saved" : "error");
      dirtyRef.current = false;
    }, 1200);
  }

  async function selectExercise(id) {
    if (id === selectedId) return;
    if (selected && dirtyRef.current) {
      await flushDraft(selected.id, codeMap[selected.id] || "");
    }
    setSelectedId(id);
    setNotice(null);
    setSaveState("saved");
  }

  async function handleExerciseTabKeyDown(event) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
      return;
    }

    const currentIndex = lesson.exercises.findIndex(
      (exercise) => exercise.id === selectedId,
    );
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % lesson.exercises.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + lesson.exercises.length) % lesson.exercises.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lesson.exercises.length - 1;
    }

    event.preventDefault();
    const buttons = event.currentTarget.querySelectorAll('[role="tab"]');
    buttons[nextIndex]?.focus();
    await selectExercise(lesson.exercises[nextIndex].id);
  }

  async function execute(mode) {
    if (!selected || busy) return;
    setBusy(mode);
    setNotice(null);

    try {
      const payload = await postJson("/api/code/run", {
        code,
        exerciseId: selected.id,
        language: "python",
        mode,
      });

      setResults((current) => ({ ...current, [selected.id]: payload.result }));
      setExerciseStates((current) => {
        const prior = current[selected.id] || { status: "not_started", attempts: 0 };
        const nextState = { ...prior };
        if (payload.progress) {
          nextState.attempts = payload.progress.attempts;
          nextState.status = payload.progress.passed ? "passed" : prior.status === "passed" ? "passed" : "attempted";
        } else if (mode === "submit") {
          nextState.status = prior.status === "passed" ? "passed" : "attempted";
        }
        return { ...current, [selected.id]: nextState };
      });

      setSaveState("saved");
      dirtyRef.current = false;

      if (payload.progress?.lessonCompleted) {
        setStatus("completed");
        setNotice({
          tone: "success",
          title: "Lesson complete",
          body:
            "Every published exercise now has a persisted passing submission. Review and mastery updates still depend on their own evidence.",
        });
        router.refresh();
      } else if (mode === "submit" && payload.progress?.passed) {
        setNotice({
          tone: "success",
          title: "Exercise passed",
          body:
            "The result was saved and concept evidence was updated. Review cards are scheduled from this evidence.",
        });
      } else if (payload.warning) {
        setNotice({
          tone: "warning",
          title: "Result not fully saved",
          body: payload.warning,
        });
      } else if (mode === "submit" && payload.result?.allTestsPassed === false) {
        setNotice({
          tone: "info",
          title: "Not passing yet",
          body:
            "The output above is real. Read the failing checks, adjust the code, and submit again when ready.",
        });
      }
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Execution could not complete",
        body: error.message,
      });
    } finally {
      setBusy(null);
    }
  }

  async function resetCode() {
    if (!selected) return;
    const starter = selected.starter_code || "";
    setCodeMap((current) => ({ ...current, [selected.id]: starter }));
    setSaveState("saving");
    const response = await saveDraftAction({
      exerciseId: selected.id,
      code: starter,
    });
    setSaveState(response?.ok ? "saved" : "error");
    dirtyRef.current = false;
  }

  function revealHint() {
    if (!selected) return;
    setHintCounts((current) => ({
      ...current,
      [selected.id]: Math.min(
        (current[selected.id] || 0) + 1,
        selected.hints.length,
      ),
    }));
  }

  const revealedHints = selected
    ? selected.hints.slice(0, hintCounts[selected.id] || 0)
    : [];

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/learn">Curriculum</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page">{lesson.title}</span>
      </nav>

      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrowRow}>
            <span className="eyebrow">Lesson {lesson.position}</span>
            <Badge tone={status === "completed" ? "success" : "neutral"} dot>
              {status === "completed"
                ? "Completed"
                : status === "in_progress"
                  ? "In progress"
                  : "Not started"}
            </Badge>
            <span className={styles.headerMeta}>
              <Clock3 size={12} aria-hidden="true" />
              {formatMinutes(lesson.estimated_minutes)}
            </span>
            <span className={styles.headerMeta}>
              {titleCase(lesson.difficulty)}
            </span>
          </div>
          <h1 className={styles.title}>{lesson.title}</h1>
          <p className={styles.description}>{lesson.description}</p>
          {lesson.concepts.length ? (
            <div className={styles.conceptRow}>
              {lesson.concepts.map((concept) => (
                <Link
                  key={concept.id}
                  href="/progress"
                  className={styles.concept}
                  title={concept.description || concept.title}
                >
                  {concept.title}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.headerSide}>
          <div className={styles.progressCard}>
            <div className={styles.progressTop}>
              <span>Exercises passed</span>
              <strong>
                {passedCount}/{lesson.exercises.length}
              </strong>
            </div>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Lesson exercise progress"
            >
              <span className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
            <p className={styles.progressNote}>
              A lesson completes only after every published check passes in a
              saved submission.
            </p>
          </div>

          {lesson.objectives?.length ? (
            <div className={styles.objectives}>
              <p className={styles.objectivesTitle}>By the end</p>
              <ul>
                {lesson.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </header>

      {status === "completed" ? (
        <Alert tone="success" title="This lesson is complete">
          All published exercises have a passing saved submission. Continue to the
          next lesson, or use review to keep the concepts available.
        </Alert>
      ) : null}

      {prerequisites.missing.length ? (
        <Alert tone="info" title="Prerequisites are not complete">
          <p>
            This lesson normally follows{" "}
            {prerequisites.missing.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? ", " : ""}
                <Link href={`/learn/${item.slug}`} className={styles.inlineLink}>
                  {item.title}
                </Link>
              </span>
            ))}
            . Nothing is locked; you can continue here if the material still makes
            sense.
          </p>
        </Alert>
      ) : null}

      {!progressPersistence ? (
        <Alert tone="warning" title="Progress cannot be saved">
          The server is missing SUPABASE_SERVICE_ROLE_KEY. Reading and drafting
          still work, but lesson completion and mastery cannot be recorded.
        </Alert>
      ) : null}

      {notice ? (
        <Alert
          tone={notice.tone}
          title={notice.title}
          action={
            notice.tone === "error" ? (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setNotice(null)}
              >
                Dismiss
              </Button>
            ) : null
          }
        >
          <p>{notice.body}</p>
        </Alert>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <article className={styles.reading}>
            <div className={styles.readingHead}>
              <BookOpen size={16} strokeWidth={1.6} aria-hidden="true" />
              <h2>Read</h2>
              <span className={styles.readingMeta}>
                {lesson.content?.sections?.length || 0} sections
              </span>
            </div>
            <LessonContent content={lesson.content} />
          </article>

          <section className={styles.practice} aria-labelledby="practice-title">
            <div className={styles.practiceHead}>
              <div>
                <p className="eyebrow">Practice</p>
                <h2 id="practice-title" className={styles.practiceTitle}>
                  Work the problem, then prove it.
                </h2>
              </div>
              <span className={styles.practiceMeta}>
                {lesson.exercises.length}{" "}
                {lesson.exercises.length === 1 ? "exercise" : "exercises"} ·{" "}
                {passedCount} passed
              </span>
            </div>

            {lesson.exercises.length ? (
              <>
                <div
                  className={styles.exerciseTabs}
                  role="tablist"
                  aria-label="Lesson exercises"
                  onKeyDown={handleExerciseTabKeyDown}
                >
                  {lesson.exercises.map((exercise, index) => {
                    const state = exerciseStates[exercise.id] || {};
                    const StatusIcon = statusIcons[state.status] || Circle;
                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        role="tab"
                        id={`exercise-tab-${exercise.id}`}
                        aria-controls="exercise-panel"
                        aria-selected={selectedId === exercise.id}
                        tabIndex={selectedId === exercise.id ? 0 : -1}
                        className={`${styles.exerciseTab} ${selectedId === exercise.id ? styles.exerciseTabActive : ""}`}
                        onClick={() => selectExercise(exercise.id)}
                      >
                        <span
                          className={`${styles.exerciseStatus} ${styles[state.status] || ""}`}
                          aria-hidden="true"
                        >
                          {state.status === "passed" ? (
                            <StatusIcon size={12} strokeWidth={2.4} />
                          ) : (
                            <span className={styles.tabDot} />
                          )}
                        </span>
                        <span className={styles.exerciseTabText}>
                          <span className={styles.exerciseTabTitle}>
                            {index + 1}. {exercise.title}
                          </span>
                          <span className={styles.exerciseTabMeta}>
                            {exerciseStatusLabel[state.status] || "Not started"}
                            {state.attempts ? ` · ${state.attempts} attempts` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selected ? (
                  <div
                    className={styles.workbench}
                    id="exercise-panel"
                    role="tabpanel"
                    aria-labelledby={`exercise-tab-${selected.id}`}
                  >
                    <div className={styles.brief}>
                      <div className={styles.briefHead}>
                        <Badge tone="neutral">{titleCase(selected.difficulty)}</Badge>
                        <span className={styles.saveState}>
                          {saveState === "saving"
                            ? "Saving draft…"
                            : saveState === "saved"
                              ? "Draft saved"
                              : saveState === "unsaved"
                                ? "Unsaved changes"
                                : "Draft not saved"}
                        </span>
                      </div>
                      <h3 className={styles.briefTitle}>{selected.title}</h3>
                      <RichText
                        text={selected.instructions}
                        className={styles.instructions}
                      />
                      {selected.expected_behavior ? (
                        <div className={styles.expected}>
                          <p className={styles.expectedLabel}>Expected behavior</p>
                          <RichText
                            text={selected.expected_behavior}
                            className={styles.expectedText}
                          />
                        </div>
                      ) : null}

                      <div className={styles.hints}>
                        <div className={styles.hintsHead}>
                          <p className={styles.expectedLabel}>
                            <Lightbulb size={12} aria-hidden="true" /> Hints
                          </p>
                          {selected.hints.length ? (
                            <span className={styles.hintCount}>
                              {revealedHints.length}/{selected.hints.length} shown
                            </span>
                          ) : null}
                        </div>
                        {revealedHints.length ? (
                          <ol className={styles.hintList}>
                            {revealedHints.map((hint, index) => (
                              <li key={hint}>
                                <span className={styles.hintIndex}>
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <span>{hint}</span>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                        {revealedHints.length < selected.hints.length ? (
                          <Button
                            variant="subtle"
                            size="sm"
                            icon={Lightbulb}
                            onClick={revealHint}
                          >
                            {revealedHints.length ? "Reveal another hint" : "Reveal a hint"}
                          </Button>
                        ) : (
                          <p className={styles.hintsDone}>
                            All hints revealed. Apply one idea at a time and run the
                            code.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={styles.editorCol}>
                      <div className={styles.editorHead}>
                        <span className={styles.editorLabel}>
                          <Code2 size={13} aria-hidden="true" /> Python
                          <span className={styles.editorFile}>
                            {selected.slug.replace(/-/g, "_")}.py
                          </span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eraser}
                          onClick={resetCode}
                          disabled={busy != null}
                        >
                          Reset to starter
                        </Button>
                      </div>

                      <div className={styles.editorSurface}>
                        <CodeEditor
                          value={code}
                          onChange={updateCode}
                          height={340}
                          ariaLabel={`Code editor for ${selected.title}`}
                        />
                      </div>

                      <div className={styles.actions}>
                        <div className={styles.actionButtons}>
                          <Button
                            variant="secondary"
                            icon={Play}
                            onClick={() => execute("run")}
                            disabled={busy != null || !executionAvailable || !canRunPlayground}
                          >
                            {busy === "run" ? "Running…" : "Run code"}
                          </Button>
                          <Button
                            icon={FlaskConical}
                            onClick={() => execute("submit")}
                            disabled={busy != null || !executionAvailable || !canRunPlayground}
                          >
                            {busy === "submit" ? "Checking…" : "Run & submit"}
                          </Button>
                          {busy ? <Spinner size={15} label="Executing code" /> : null}
                        </div>
                        <p className={styles.actionNote}>
                          {!canRunPlayground
                            ? "Exercise checks need SUPABASE_SERVICE_ROLE_KEY on the server. The editor still saves drafts, but nothing will execute."
                            : executionAvailable
                              ? "Submission results are graded inside the isolated runner. Hidden checks reveal status only."
                              : "Isolated execution is not configured, so code cannot run or be graded."}
                        </p>
                      </div>

                      {result ? (
                        <ExecutionResult result={result} />
                      ) : (
                        <div className={styles.noResult}>
                          <Terminal size={15} strokeWidth={1.5} aria-hidden="true" />
                          <p>
                            No execution yet for this exercise. Run your code to see
                            real output, or submit to grade every check.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={Code2} title="No exercise selected">
                    <p>Choose an exercise above to open the editor.</p>
                  </EmptyState>
                )}
              </>
            ) : (
              <EmptyState icon={BookOpen} title="No published exercises">
                <p>
                  This lesson has no exercises yet, so it cannot be marked complete
                  through practice. Reading remains available.
                </p>
              </EmptyState>
            )}
          </section>

          <nav className={styles.lessonNav} aria-label="Lesson navigation">
            {previous ? (
              <Link href={`/learn/${previous.slug}`} className={styles.lessonNavLink}>
                <ArrowLeft size={14} aria-hidden="true" />
                <span>
                  <span className={styles.lessonNavLabel}>Previous</span>
                  <span className={styles.lessonNavTitle}>{previous.title}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/learn/${next.slug}`}
                className={`${styles.lessonNavLink} ${styles.lessonNavNext}`}
              >
                <span>
                  <span className={styles.lessonNavLabel}>Next</span>
                  <span className={styles.lessonNavTitle}>{next.title}</span>
                </span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>

        <aside className={styles.aside}>
          <div className={styles.tutorSticky}>
            <TutorPanel
              initialByMode={tutor}
              preferredMode={preferredMode}
              lessonId={lesson.id}
              exerciseId={selected?.id || null}
              code={code}
              currentQuestion={selected?.instructions || ""}
              aiConfigured={aiConfigured}
            />
            <div className={styles.asideNote}>
              <Sparkles size={13} strokeWidth={1.6} aria-hidden="true" />
              <p>
                The tutor sees this exercise, your current draft, and recent
                recorded execution evidence. It cannot run code or edit your
                editor.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
