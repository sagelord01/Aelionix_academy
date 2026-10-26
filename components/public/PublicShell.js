import Link from "next/link";
import Logo from "@/components/ui/Logo";
import styles from "./PublicShell.module.css";

const navLinks = [
  { href: "/#curriculum", label: "Curriculum" },
  { href: "/#tutor-modes", label: "Tutor modes" },
  { href: "/#approach", label: "Approach" },
];

export default function PublicShell({ children, signedIn = false }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo />
          <nav className={styles.nav} aria-label="Public">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            {signedIn ? (
              <Link href="/dashboard" className={styles.primaryAction}>
                Open workspace
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.secondaryAction}>
                  Sign in
                </Link>
                <Link href="/signup" className={styles.primaryAction}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Logo />
            <p>
              A deliberate programming workspace: real execution, inspected
              evidence, and two genuinely different tutor stances.
            </p>
          </div>
          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Workspace</span>
              <Link href="/signup">Create account</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/forgot-password">Reset password</Link>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>The product</span>
              <Link href="/#curriculum">Curriculum</Link>
              <Link href="/#tutor-modes">Tutor modes</Link>
              <Link href="/#approach">How it works</Link>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerLabel}>Legal</span>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBase}>
          <span>Learning Workspace</span>
          <span>Built as a working application, not a demo with fake data.</span>
        </div>
      </footer>
    </div>
  );
}
