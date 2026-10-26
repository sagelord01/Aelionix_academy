import styles from "./ActivityBars.module.css";

export default function ActivityBars({ series = [], label = "Learning activity" }) {
  const max = Math.max(1, ...series.map((day) => day.count));
  const total = series.reduce((sum, day) => sum + day.count, 0);
  const activeDays = series.filter((day) => day.count > 0).length;

  return (
    <div className={styles.wrap}>
      <div className={styles.meta}>
        <span>
          {total} recorded {total === 1 ? "event" : "events"} · {activeDays} active{" "}
          {activeDays === 1 ? "day" : "days"}
        </span>
        <span className={styles.range}>
          {series[0]?.date?.slice(5).replace("-", "/")} —{" "}
          {series[series.length - 1]?.date?.slice(5).replace("-", "/")}
        </span>
      </div>
      <div
        className={styles.chart}
        role="img"
        aria-label={`${label}: ${total} events across ${series.length} days`}
      >
        {series.map((day) => {
          const height = day.count === 0 ? 3 : Math.max(8, Math.round((day.count / max) * 100));
          return (
            <span
              key={day.date}
              className={`${styles.bar} ${day.count ? styles.withData : ""}`}
              style={{ height: `${height}%` }}
              title={`${day.date}: ${day.count} event${day.count === 1 ? "" : "s"}`}
            />
          );
        })}
      </div>
    </div>
  );
}
