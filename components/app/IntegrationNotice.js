import Alert from "@/components/ui/Alert";

export default function IntegrationNotice({ status, compact = false }) {
  if (!status) return null;

  const items = [];

  if (!status.supabase.configured) {
    items.push(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  if (!status.supabase.adminConfigured) {
    items.push(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Progress, assessment grading, tutor history, and review scheduling cannot be saved.",
    );
  }
  if (!status.ai.configured) {
    items.push(
      `The tutor provider is not configured (${status.ai.missing.join(", ") || "missing provider settings"}). Tutor messages will fail truthfully rather than pretend to answer.`,
    );
  }
  if (!status.execution.configured) {
    items.push(
      `Isolated Python execution is not configured (${status.execution.missing.join(", ") || "missing execution URL"}). Code runs and practical checks are unavailable.`,
    );
  }

  if (!items.length) return null;

  return (
    <Alert tone="warning" title="Some integrations are not configured">
      {compact ? (
        <p>{items[0]}</p>
      ) : (
        <ul style={{ display: "grid", gap: "6px" }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: "8px", color: "var(--text-faint)", fontSize: "0.78rem" }}>
        The interface will show explicit errors instead of simulated output. See
        the README for setup.
      </p>
    </Alert>
  );
}
