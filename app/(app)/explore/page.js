import Link from "next/link";
import { ArrowRight, Compass, History, Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ExploreCreate from "@/components/explore/ExploreCreate";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getAiConfig, getExecutionConfig } from "@/lib/config/env";
import { getRecentExplorations } from "@/lib/data/tutor";
import { formatDateTime, relativeTime } from "@/lib/utils/format";
import styles from "./Explore.module.css";

export const metadata = { title: "Explore" };

export default async function ExplorePage() {
  const { supabase, user } = await requireOnboardedUser();
  const explorations = await getRecentExplorations(supabase, user.id, 8);
  const ai = getAiConfig();
  const execution = getExecutionConfig();

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Open studio"
        title="Explore something you cannot explain yet."
        description="A scratchpad, a real Python runner, and a partner that works on your topic with you. Exploration is not a lesson and does not count as completion."
      />

      <div className={styles.grid}>
        <div className={styles.main}>
          <ExploreCreate aiConfigured={ai.configured} />

          <section className={styles.recent} aria-labelledby="recent-title">
            <div className={styles.recentHead}>
              <div>
                <p className="eyebrow">Your studio</p>
                <h2 id="recent-title" className={styles.recentTitle}>
                  Recent explorations
                </h2>
              </div>
              <History size={16} strokeWidth={1.5} aria-hidden="true" />
            </div>

            {explorations.length ? (
              <ul className={styles.list}>
                {explorations.map((session) => (
                  <li key={session.id}>
                    <Link href={`/explore/${session.id}`} className={styles.row}>
                      <span className={styles.rowIcon} aria-hidden="true">
                        <Compass size={15} strokeWidth={1.5} />
                      </span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowTitle}>{session.topic}</span>
                        <span className={styles.rowMeta}>
                          {formatDateTime(session.created_at)} · updated{" "}
                          {relativeTime(session.updated_at)}
                        </span>
                      </span>
                      <span className={styles.rowStatus}>
                        <Badge tone={session.status === "active" ? "neutral" : "success"}>
                          {session.status}
                        </Badge>
                      </span>
                      <ArrowRight
                        size={15}
                        strokeWidth={1.5}
                        className={styles.rowArrow}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Compass} title="No explorations yet">
                <p>
                  Start with one concrete question above. It will appear here once
                  it has been saved to your account.
                </p>
              </EmptyState>
            )}
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={styles.panel}>
            <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />
            <h2 className={styles.panelTitle}>How exploration differs</h2>
            <ul className={styles.rules}>
              <li>
                <strong>No grading.</strong> Scratchpad runs are evidence only when
                you later submit an exercise.
              </li>
              <li>
                <strong>Partner-first.</strong> The AI Coding Partner explains and
                plans; the Coach mode is still available and stays separate.
              </li>
              <li>
                <strong>Nothing invented.</strong> The tutor sees only your topic,
                scratchpad, and actual execution results from this session.
              </li>
            </ul>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Runner status</h2>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Python execution</span>
              <Badge tone={execution.configured ? "success" : "warning"} dot>
                {execution.configured ? "Ready" : "Not configured"}
              </Badge>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>AI partner</span>
              <Badge tone={ai.configured ? "success" : "warning"} dot>
                {ai.configured ? `${ai.providerLabel} ready` : "Not configured"}
              </Badge>
            </div>
            {!execution.configured ? (
              <p className={styles.panelNote}>
                Code will not run until CODE_EXECUTION_API_URL is configured. The
                scratchpad still saves locally.
              </p>
            ) : null}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Prefer structure?</h2>
            <p className={styles.panelNote}>
              Exploration is deliberately open-ended. The curriculum gives you
              ordered lessons, exercises, and saved evidence when you want a path.
            </p>
            <Button href="/learn" variant="secondary" size="sm" icon={ArrowRight}>
              Open the curriculum
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
