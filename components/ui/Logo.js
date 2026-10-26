import Link from "next/link";
import styles from "./Logo.module.css";

export default function Logo({ href = "/", label = "Learning Workspace" }) {
  return (
    <Link href={href} className={styles.logo} aria-label={`${label} home`}>
      <span className={styles.mark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className={styles.wordmark}>{label}</span>
    </Link>
  );
}
