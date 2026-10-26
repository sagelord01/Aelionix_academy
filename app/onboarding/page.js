import { redirect } from "next/navigation";
import Logo from "@/components/ui/Logo";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import { getProfile, requireUser } from "@/lib/auth/guards";
import styles from "./Onboarding.module.css";

export const metadata = { title: "Set up your Aelionix Academy workspace" };

// Onboarding reads the current user and profile before rendering the form.
export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Tell the workspace where you are",
    body: "No placement test is hidden in this form. Your answers set a starting point and the tutor's default stance.",
  },
  {
    title: "Take a short adaptive check",
    body: "Up to ten questions across the foundations. A practical Python question appears only when early evidence supports it.",
  },
  {
    title: "Begin with evidence",
    body: "Recommendations, mastery, and review scheduling are built from attempts and answers you actually produce.",
  },
];

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.top}>
        <Logo priority />
        <div className={styles.progress}>
          <span>Setup 1 of 2</span>
          <span className={styles.steps} aria-hidden="true">
            <span className={`${styles.step} ${styles.stepOn}`} />
            <span className={styles.step} />
          </span>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.aside}>
          <div>
            <p className="eyebrow">Onboarding</p>
            <h2 className={styles.asideTitle}>
              A workspace shaped around how you learn.
            </h2>
          </div>
          <p className={styles.asideBody}>
            These choices change how lessons are recommended and how the tutor
            talks to you. They never lock you out of content.
          </p>
          <ol className={styles.asideList}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.asideItem}>
                <span className={styles.asideItemTitle}>
                  {String(index + 1).padStart(2, "0")} — {step.title}
                </span>
                <span className={styles.asideItemBody}>{step.body}</span>
              </li>
            ))}
          </ol>
        </aside>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h1>Set up your learning context</h1>
            <p>
              Everything here can be changed later. Be honest about your
              starting point; the adaptive check will adjust anyway.
            </p>
          </div>
          <OnboardingForm profile={profile} />
        </section>
      </div>
    </main>
  );
}
