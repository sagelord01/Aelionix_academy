import Link from "next/link";
import {
  ArrowUpRight,
  Database,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserRound,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import IntegrationNotice from "@/components/app/IntegrationNotice";
import SettingsForm from "@/components/settings/SettingsForm";
import DeleteAccountForm from "@/components/settings/DeleteAccountForm";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getIntegrationStatus } from "@/lib/config/env";
import { formatDate } from "@/lib/utils/format";
import styles from "./Settings.module.css";

export const metadata = { title: "Settings" };

function IntegrationRow({ icon: Icon, label, detail, configured }) {
  return (
    <li className={styles.integrationRow}>
      <span className={styles.integrationIcon} aria-hidden="true">
        <Icon size={15} strokeWidth={1.5} />
      </span>
      <span className={styles.integrationBody}>
        <span className={styles.integrationLabel}>{label}</span>
        <span className={styles.integrationDetail}>{detail}</span>
      </span>
      <Badge tone={configured ? "success" : "warning"} dot>
        {configured ? "Ready" : "Missing"}
      </Badge>
    </li>
  );
}

export default async function SettingsPage() {
  const { user, profile } = await requireOnboardedUser();
  const integration = getIntegrationStatus();

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Settings"
        title="Tune the workspace, not the evidence."
        description="Preferences change how lessons are recommended and how the tutor responds. They never change what your answers and attempts prove."
      />

      <IntegrationNotice status={integration} compact />

      <div className={styles.layout}>
        <div className={styles.main}>
          <SettingsForm profile={profile} />
        </div>

        <aside className={styles.aside}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Account</h2>
              <UserRound size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <dl className={styles.details}>
              <div>
                <dt>Email</dt>
                <dd>{user.email || "No email on this account"}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{formatDate(user.created_at)}</dd>
              </div>
              <div>
                <dt>Last sign-in</dt>
                <dd>{formatDate(user.last_sign_in_at)}</dd>
              </div>
              <div>
                <dt>Onboarding</dt>
                <dd>
                  {profile.onboarding_completed ? "Completed" : "Not completed"}
                </dd>
              </div>
            </dl>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Integration status</h2>
              <Database size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <ul className={styles.integrations}>
              <IntegrationRow
                icon={KeyRound}
                label="Authentication"
                detail="Supabase URL and public anon key"
                configured={integration.supabase.configured}
              />
              <IntegrationRow
                icon={ShieldCheck}
                label="Trusted writes"
                detail="Service role for grading, history, and progress"
                configured={integration.supabase.adminConfigured}
              />
              <IntegrationRow
                icon={Sparkles}
                label="AI tutor"
                detail={
                  integration.ai.configured
                    ? `${integration.ai.provider} configured`
                    : `Needs ${integration.ai.missing.join(", ") || "provider settings"}`
                }
                configured={integration.ai.configured}
              />
              <IntegrationRow
                icon={Terminal}
                label="Python execution"
                detail={
                  integration.execution.configured
                    ? `${integration.execution.provider} · language ${integration.execution.languageId}`
                    : `Needs ${integration.execution.missing.join(", ") || "execution settings"}`
                }
                configured={integration.execution.configured}
              />
            </ul>
            <p className={styles.panelNote}>
              Missing integrations produce explicit setup errors in the relevant
              screen. No feature falls back to fabricated output.
            </p>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Data & privacy</h2>
              <ShieldCheck size={15} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className={styles.panelNote}>
              Drafts, attempts, and tutor messages are stored in Supabase against
              your account. Exploration scratchpads stay in this browser&apos;s
              local storage until you delete them.
            </p>
            <div className={styles.linkRow}>
              <Link href="/privacy" className={styles.panelLink}>
                Privacy <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
              <Link href="/terms" className={styles.panelLink}>
                Terms <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className={`${styles.panel} ${styles.dangerPanel}`}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Delete account</h2>
              <Badge tone="danger">Irreversible</Badge>
            </div>
            <DeleteAccountForm
              adminConfigured={integration.supabase.adminConfigured}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
