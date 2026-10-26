import styles from "./RouteState.module.css";

export default function RouteState({
  icon: Icon,
  eyebrow,
  title,
  children,
  actions,
  compact = false,
}) {
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ""}`}>
      <div className={styles.panel}>
        {Icon ? (
          <span className={styles.icon} aria-hidden="true">
            <Icon size={compact ? 20 : 26} strokeWidth={1.4} />
          </span>
        ) : null}
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {children ? <div className={styles.body}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}
