import Link from "next/link";
import styles from "../Legal.module.css";

export const metadata = {
  title: "Privacy",
  description:
    "What this learning workspace stores, why it stores it, and the controls available to a learner.",
};

const sections = [
  {
    id: "scope",
    title: "Scope and responsibility",
    body: [
      "This page describes the reference Learning Workspace application. It is a factual description of what the code does, not legal advice and not a compliance certification. Anyone who deploys this application is responsible for publishing their own policy, identifying their legal entity, and meeting the requirements that apply to them.",
    ],
  },
  {
    id: "collected",
    title: "Data the application stores",
    body: [
      "When you create an account, Supabase Auth stores your email address and authentication data. The application also stores a profile containing your display name, learning goal, experience level, preferred tutor mode, weekly time preference, and hint preference.",
      "As you use the workspace, the application stores learning data against your account: lesson and exercise progress, exercise drafts, code attempts and their execution results, assessment attempts and responses, concept evidence, review items and review answers, exploration session topics, tutor conversations and messages, and learning activity events. Code attempts can contain the code you wrote.",
      "Operational records include AI usage metadata (route, provider, model, status, and token counts when the provider returns them) and rate-limit counters. Server logs may record request errors and operational events. The application does not intentionally log request bodies, API keys, or learner code in its own error logs.",
    ],
  },
  {
    id: "why",
    title: "Why it is processed",
    body: [
      "Account and profile data is used to authenticate you, render the workspace, personalize recommendations, and provide context to the tutor.",
      "Learning data is used to save your work, grade answers, persist execution results, derive mastery and review scheduling, and show your progress. Hidden tests and answer keys are used only to grade your responses; the application does not expose them to your browser.",
      "Operational records are used to apply rate limits, diagnose failures, and understand provider usage. They are not used to create advertising profiles. This reference implementation contains no advertising or third-party analytics SDK.",
    ],
  },
  {
    id: "processors",
    title: "Service providers",
    body: [
      "Supabase provides authentication and the Postgres database used by this deployment. Your account data and learning data are stored there.",
      "When you send a tutor message, the application sends the message, a bounded set of context (the current lesson or exploration, selected exercise, your code, relevant mastery evidence, and any execution result), and conversation history to the configured AI provider. The default adapter targets Groq. The operator chooses the provider and its retention terms.",
      "When you run or submit code, the application sends your code and the test harness for that exercise to the configured isolated execution provider. The default adapter targets a Judge0-compatible service. That provider receives the code and tests needed to run them; it does not receive your email address from this application.",
      "Your hosting provider may process request logs, cookies, and network metadata as part of serving the application. The operator's deployment determines that provider.",
    ],
  },
  {
    id: "browser",
    title: "Cookies and local storage",
    body: [
      "Supabase authentication uses cookies to keep you signed in. The application also uses server-side session refresh. Signing out clears the authentication session.",
      "The exploration scratchpad is intentionally browser-only. Its text is stored in this browser's local storage under a key tied to the exploration session, is not sent to the AI provider unless you include it in a message or run it as code, and is not visible to the server until you take one of those actions. The reset control restores the starter text; clearing site data removes the stored scratchpad from this browser.",
    ],
  },
  {
    id: "retention",
    title: "Retention and deletion",
    body: [
      "Account and learning records are retained while your account exists. Deleting your account removes the profile and cascades to learner-owned records, including progress, drafts, attempts, assessments, tutor messages, exploration sessions, and review history.",
      "Some operational records may be retained by the hosting or service providers under their own policies. The operator may add a shorter retention job for code attempts and tutor messages; the reference schema documents that option rather than silently deleting work.",
      "Account deletion requires your password and the server-side service role key. If the key is not configured, the application refuses the request rather than pretending deletion succeeded.",
    ],
  },
  {
    id: "security",
    title: "Security measures and limits",
    body: [
      "The application enforces authentication on workspace routes, validates inputs with Zod, applies row-level security to learner-owned tables, and keeps hidden tests, answer keys, and usage records away from the anon and authenticated database roles. Privileged writes happen only on the server after ownership checks.",
      "No system is perfectly secure. Rate limiting in the reference implementation is best-effort and not atomic across processes. You should avoid submitting secrets, credentials, or sensitive personal data in code, tutor messages, or exploration topics.",
    ],
  },
  {
    id: "rights",
    title: "Your controls",
    body: [
      "You can change profile preferences in Settings, sign out at any time, reset or delete drafts in the lesson workspace, and delete your account from Settings. You can clear the exploration scratchpad from its own control or by clearing site data.",
      "For access, correction, export, or other rights that apply in your jurisdiction, contact the operator of the deployment you are using. This reference application does not invent a contact address; the operator must provide one.",
    ],
  },
  {
    id: "children",
    title: "Children",
    body: [
      "The workspace is intended for learners old enough to hold an account under the operator's policy. It is not directed to children under 13, and the reference implementation does not include parental consent or age-verification flows. An operator serving younger learners must add the controls their jurisdiction requires.",
    ],
  },
  {
    id: "changes",
    title: "Changes",
    body: [
      "This page may change when the application or its providers change. The operator should keep the published version current and tell learners about material changes through the deployment's normal channels.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className="eyebrow">Legal</p>
        <h1 className={styles.title}>Privacy</h1>
        <p className={styles.lede}>
          The workspace stores what it needs to teach, grade, and remember your
          work. This page names those records, the providers that receive them,
          and the controls you have.
        </p>
        <div className={styles.meta}>
          <span>Reference deployment</span>
          <span>Reviewed October 2026</span>
        </div>
      </header>

      <div className={styles.summary}>
        <h2 className={styles.summaryTitle}>The short version</h2>
        <ul className={styles.summaryList}>
          <li>Supabase stores your account and learning records.</li>
          <li>
            The configured AI provider receives tutor messages and bounded
            context.
          </li>
          <li>
            The configured execution provider receives the code and tests needed
            to run it.
          </li>
          <li>The exploration scratchpad stays in your browser until you act on it.</li>
          <li>Account deletion removes learner-owned records through database cascades.</li>
        </ul>
      </div>

      <div className={styles.sections}>
        {sections.map((section, index) => (
          <section key={section.id} id={section.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {section.title}
            </h2>
            <div className={styles.body}>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className={styles.footerNote}>
        This document describes the reference implementation, not a promise that
        a particular deployment has configured every provider. If a provider is
        not configured, the related feature reports a setup error instead of
        sending data. This is not legal advice.
      </p>
      <div className={styles.footerLinks}>
        <Link href="/terms">Terms of use</Link>
        <Link href="/">Back to the overview</Link>
      </div>
    </div>
  );
}
