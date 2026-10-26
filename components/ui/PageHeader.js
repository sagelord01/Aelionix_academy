import styles from "./PageHeader.module.css";

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
