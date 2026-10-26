import styles from "./EmptyState.module.css";

export default function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  compact = false,
}) {
  return (
    <div className={`${styles.empty} ${compact ? styles.compact : ""}`}>
      {Icon ? (
        <span className={styles.icon} aria-hidden="true">
          <Icon size={compact ? 18 : 22} strokeWidth={1.4} />
        </span>
      ) : null}
      <h3 className={styles.title}>{title}</h3>
      {children ? <div className={styles.body}>{children}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
