import styles from "./Badge.module.css";

export default function Badge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}) {
  return (
    <span className={`${styles.badge} ${styles[tone] || ""} ${className}`}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
