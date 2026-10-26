import styles from "./Form.module.css";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  optional = false,
  className = "",
}) {
  return (
    <div className={`${styles.field} ${className}`}>
      {label ? (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {optional ? <span className={styles.optional}>Optional</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return (
    <textarea
      className={`${styles.input} ${styles.textarea} ${className}`}
      rows={rows}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${styles.input} ${styles.select} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, id, className = "", ...props }) {
  return (
    <div className={`${styles.checkboxRow} ${className}`}>
      <input
        type="checkbox"
        id={id}
        className={styles.checkbox}
        {...props}
      />
      <label htmlFor={id} className={styles.checkboxLabel}>
        {label}
      </label>
    </div>
  );
}
