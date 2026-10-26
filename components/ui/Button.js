import Link from "next/link";
import styles from "./Button.module.css";

export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  icon: Icon,
  iconPosition = "right",
  fullWidth = false,
  ...props
}) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {Icon && iconPosition === "left" ? (
        <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
      {Icon && iconPosition === "right" ? (
        <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {content}
    </button>
  );
}
