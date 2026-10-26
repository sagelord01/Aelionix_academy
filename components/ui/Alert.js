import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import styles from "./Alert.module.css";

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
};

export default function Alert({
  tone = "info",
  title,
  children,
  action,
  className = "",
}) {
  const Icon = icons[tone] || Info;
  return (
    <div
      className={`${styles.alert} ${styles[tone]} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={16} strokeWidth={1.6} className={styles.icon} aria-hidden="true" />
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.content}>{children}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </div>
  );
}
