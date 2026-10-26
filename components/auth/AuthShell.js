import { Check } from "lucide-react";
import Logo from "@/components/ui/Logo";
import styles from "./AuthShell.module.css";

const points = [
  "Real Python execution in an isolated sandbox — never in the app server.",
  "A tutor that adapts its evidence, not one that invents your progress.",
  "One workspace for lessons, drafts, execution, review, and mastery.",
];

export default function AuthShell({
  title,
  description,
  children,
  footer,
  eyebrow = "Your learning workspace",
}) {
  return (
    <div className={styles.page}>
      <aside className={styles.aside}>
        <Logo />
        <div className={styles.asideInner}>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className={styles.asideTitle}>
            Understanding is the
            <br />
            thing you keep.
          </h2>
          <p className={styles.asideBody}>
            Learning Workspace combines a careful curriculum, real code
            execution, and evidence-based tutoring. Nothing here claims progress
            you have not demonstrated.
          </p>
          <ul className={styles.points}>
            {points.map((point) => (
              <li key={point} className={styles.point}>
                <Check size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.asideFoot}>Monochrome Precision Glass</p>
      </aside>

      <main id="main-content" className={styles.main}>
        <div className={styles.mainTop}>
          <Logo href="/" label="Learning Workspace" />
        </div>
        <div className={styles.mainInner}>
          <header className={styles.heading}>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </header>
          {children}
          {footer ? <div className={styles.footer}>{footer}</div> : null}
          <p className={styles.legal}>
            By continuing, you agree to the <a href="/terms">terms</a> and{" "}
            <a href="/privacy">privacy policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
