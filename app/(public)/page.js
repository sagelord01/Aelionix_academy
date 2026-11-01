import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Compass,
  Layers,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import HeroDemoSandbox from "@/components/homepage/HeroDemoSandbox";
import { pythonTrack } from "@/data/curriculum/python";
import { titleCase } from "@/lib/utils/format";
import styles from "./Home.module.css";

const lessons = pythonTrack.lessons;
const exerciseCount = lessons.reduce(
  (sum, lesson) => sum + lesson.exercises.length,
  0,
);
const conceptSlugs = new Set(lessons.flatMap((lesson) => lesson.concepts));

const recorded = [
  "Real stdout and stderr from the isolated Python service",
  "Pass and fail status for visible and hidden checks",
  "Drafts, attempts, and submission history against your account",
  "Concept evidence built from graded answers and passing work",
  "A review schedule that moves with how you actually recall",
];

const refused = [
  "Simulated execution when the runner is not configured",
  "A completion badge presented as mastery",
  "Streaks, XP, or activity invented to look busy",
  "Testimonials or learner statistics we cannot source",
  "AI output pretending it ran your code",
];

const loop = [
  {
    step: "01",
    title: "Set a starting point",
    body: "An adaptive check moves up and down with your answers. A practical Python question appears only after enough early evidence supports it.",
  },
  {
    step: "02",
    title: "Work in the lesson workspace",
    body: "Read a focused explanation, then edit and run Python against visible and hidden checks. Drafts autosave; every graded submission is kept.",
  },
  {
    step: "03",
    title: "Choose the tutor stance",
    body: "Ask the coach for the smallest useful hint, or work with the partner on a plan. The two use different instructions and separate conversations.",
  },
  {
    step: "04",
    title: "Review what you can show",
    body: "Passing work and graded answers create concept evidence and recall cards. Progress shows the evidence, including where it is still thin.",
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className="eyebrow">
            <span className={styles.pulse} aria-hidden="true" />
            Python Foundations · working curriculum
          </p>
          <h1 className={styles.heroTitle}>
            Learn by understanding.
            <br />
            <span className={styles.heroAccent}>Build by doing.</span>
          </h1>
          <p className={styles.heroLede}>
            A deliberate AI learning academy for programming. Read a short
            lesson, run real Python in an isolated service, and let graded
            answers and passing tests decide what you should study next.
          </p>
          <div className={styles.heroActions}>
            <Button href="/signup" size="lg" icon={ArrowRight}>
              Create your workspace
            </Button>
            <Button href="/login" size="lg" variant="secondary">
              Sign in
            </Button>
          </div>
          <dl className={styles.heroMeta}>
            <div>
              <dt>Lessons</dt>
              <dd>{lessons.length}</dd>
            </div>
            <div>
              <dt>Exercises</dt>
              <dd>{exerciseCount}</dd>
            </div>
            <div>
              <dt>Concepts</dt>
              <dd>{conceptSlugs.size}</dd>
            </div>
            <div>
              <dt>Fabricated</dt>
              <dd>Nothing</dd>
            </div>
          </dl>
        </div>

        <HeroDemoSandbox />
      </section>

      <section className={styles.strip} aria-label="Core principles">
        <div className={styles.stripItem}>
          <Terminal size={17} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <span className={styles.stripTitle}>Real execution</span>
            <span className={styles.stripBody}>
              Learner code runs in a separate sandbox, never inside the web app.
            </span>
          </div>
        </div>
        <div className={styles.stripItem}>
          <Layers size={17} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <span className={styles.stripTitle}>Evidence-based mastery</span>
            <span className={styles.stripBody}>
              Status changes only when answers and practical work meet a rule.
            </span>
          </div>
        </div>
        <div className={styles.stripItem}>
          <Sparkles size={17} strokeWidth={1.5} aria-hidden="true" />
          <div>
            <span className={styles.stripTitle}>Two tutor stances</span>
            <span className={styles.stripBody}>
              A hint-first coach and a direct partner, with separate prompts.
            </span>
          </div>
        </div>
      </section>

      <section id="curriculum" className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionCopy}>
            <p className="eyebrow">The path</p>
            <h2 className={styles.sectionTitle}>
              A first curriculum that ends in programs, not trivia.
            </h2>
            <p className={styles.sectionLede}>
              Values, control flow, collections, functions, errors, files,
              classes, and a small expense report. Every lesson pairs a short
              explanation with exercises that actually run.
            </p>
          </div>
          <Badge tone="neutral">{pythonTrack.title}</Badge>
        </div>

        <div className={styles.lessonGrid}>
          {lessons.map((lesson) => (
            <article key={lesson.slug} className={styles.lessonCard}>
              <div className={styles.lessonTop}>
                <span className={styles.lessonIndex}>
                  {String(lesson.position).padStart(2, "0")}
                </span>
                <span className={styles.lessonMeta}>
                  {titleCase(lesson.difficulty)} · {lesson.estimatedMinutes} min
                </span>
              </div>
              <h3 className={styles.lessonTitle}>{lesson.title}</h3>
              <p className={styles.lessonBody}>{lesson.description}</p>
              <div className={styles.lessonFoot}>
                <span className={styles.lessonCount}>
                  {lesson.exercises.length}{" "}
                  {lesson.exercises.length === 1 ? "exercise" : "exercises"}
                </span>
                <span className={styles.lessonConcepts}>
                  {lesson.concepts
                    .map((slug) => slug.replace(/-/g, " "))
                    .join(" · ")}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="approach" className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionCopy}>
            <p className="eyebrow">The loop</p>
            <h2 className={styles.sectionTitle}>Understand, attempt, inspect, return.</h2>
            <p className={styles.sectionLede}>
              The workspace is built around a short cycle. Nothing in it depends
              on a daily streak or a completion percentage pretending to be
              knowledge.
            </p>
          </div>
        </div>

        <div className={styles.loopGrid}>
          {loop.map((item) => (
            <article key={item.step} className={styles.loopCard}>
              <span className={styles.loopIndex}>{item.step}</span>
              <h3 className={styles.loopTitle}>{item.title}</h3>
              <p className={styles.loopBody}>{item.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.evidenceGrid}>
          <article className={styles.evidenceCard}>
            <div className={styles.evidenceHead}>
              <CheckCircle2 size={17} strokeWidth={1.5} aria-hidden="true" />
              <h3>What the workspace records</h3>
            </div>
            <ul className={styles.evidenceList}>
              {recorded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className={`${styles.evidenceCard} ${styles.refusedCard}`}>
            <div className={styles.evidenceHead}>
              <XCircle size={17} strokeWidth={1.5} aria-hidden="true" />
              <h3>What it refuses to fake</h3>
            </div>
            <ul className={styles.evidenceList}>
              {refused.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="tutor-modes" className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionCopy}>
            <p className="eyebrow">Tutor modes</p>
            <h2 className={styles.sectionTitle}>
              Guidance is a stance, not a label on the same answer.
            </h2>
            <p className={styles.sectionLede}>
              Both modes see the current lesson, exercise, your code, prior
              mastery, and any real execution result. They differ in how much
              they withhold and how directly they collaborate.
            </p>
          </div>
        </div>

        <div className={styles.modeGrid}>
          <article className={styles.modeCard}>
            <div className={styles.modeTop}>
              <Compass size={18} strokeWidth={1.5} aria-hidden="true" />
              <Badge tone="neutral">Coach · hint-first</Badge>
            </div>
            <h3 className={styles.modeTitle}>Independent Coding Coach</h3>
            <p className={styles.modeBody}>
              Restates the goal, points at the relevant line or concept, and
              escalates through five hint levels. It prefers a strong hint or a
              partial example over writing the full solution, and asks a short
              understanding check when it helps.
            </p>
            <ul className={styles.modeList}>
              <li>Progressive hints before complete answers</li>
              <li>Responds to the actual error or code excerpt</li>
              <li>Withholds hidden tests and system instructions</li>
            </ul>
          </article>

          <article className={`${styles.modeCard} ${styles.modeCardAlt}`}>
            <div className={styles.modeTop}>
              <Code2 size={18} strokeWidth={1.5} aria-hidden="true" />
              <Badge tone="solid">Partner · direct</Badge>
            </div>
            <h3 className={styles.modeTitle}>AI Coding Partner</h3>
            <p className={styles.modeBody}>
              Explains directly, plans multi-step work, compares approaches, and
              may generate clearly marked example code when asked. It cannot
              edit your editor or claim it ran something; execution evidence must
              come from the runner.
            </p>
            <ul className={styles.modeList}>
              <li>Short plan before a larger implementation</li>
              <li>Concrete examples with the reasoning attached</li>
              <li>Separate conversations from coach mode</li>
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaCopy}>
            <p className="eyebrow">Start honestly</p>
            <h2 className={styles.ctaTitle}>
              Bring a question. Leave with evidence.
            </h2>
            <p className={styles.ctaLede}>
              Setup is two screens: a short profile and an adaptive check.
              Recommendations begin provisional and change when your work gives
              them something real to stand on.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Button href="/signup" size="lg" icon={ArrowRight}>
              Create account
            </Button>
            <Button href="/login" size="lg" variant="secondary" icon={BookOpen}>
              Sign in
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
