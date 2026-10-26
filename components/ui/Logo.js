import Image from "next/image";
import Link from "next/link";
import styles from "./Logo.module.css";

/*
 * The supplied logo is a vertical lockup. Compact placements use a
 * proportional, exact-pixel crop of the emblem plus a live text wordmark;
 * roomy placements use the full lockup crop. Neither derivative is recolored
 * or stretched, and the original asset in public/ stays untouched.
 */
const assets = {
  compact: { src: "/aelionix-mark.png", width: 830, height: 654 },
  full: { src: "/aelionix-lockup.png", width: 1227, height: 959 },
};

export default function Logo({
  href = "/",
  label = "Aelionix Academy",
  variant = "compact",
  className = "",
  priority = false,
  showWordmark = true,
}) {
  const full = variant === "full";
  const asset = full ? assets.full : assets.compact;
  const classes = [styles.logo, full ? styles.full : styles.compact, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={classes}>
      <span className={styles.mark}>
        <Image
          src={asset.src}
          alt={label}
          width={asset.width}
          height={asset.height}
          sizes={
            full
              ? "(max-width: 680px) 140px, 188px"
              : "(max-width: 520px) 38px, 43px"
          }
          priority={priority}
          className={styles.image}
        />
      </span>
      {!full && showWordmark ? (
        <span className={styles.wordmark} aria-hidden="true">
          <span className={styles.name}>Aelionix</span>
          <span className={styles.descriptor}>Academy</span>
        </span>
      ) : null}
    </Link>
  );
}
