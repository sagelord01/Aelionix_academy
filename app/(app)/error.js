"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import RouteState from "@/components/ui/RouteState";
import Button from "@/components/ui/Button";

export default function WorkspaceError({ error, reset }) {
  useEffect(() => {
    // Log only the operational message in the browser console. Do not render
    // raw server errors or stack traces to the learner.
    console.error("Workspace route error:", error?.message || "unknown");
  }, [error]);

  return (
    <RouteState
      icon={TriangleAlert}
      eyebrow="Something failed"
      title="This screen could not load its data."
    >
      <p>
        The page hit an error while reading from the database or a connected
        service. Your drafts and persisted attempts are not changed by a page
        error.
      </p>
      {error?.digest ? (
        <p style={{ color: "var(--text-faint)", fontSize: "0.72rem" }}>
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Button type="button" onClick={reset} icon={RotateCcw}>
          Try again
        </Button>
        <Button href="/dashboard" variant="secondary">
          Back to dashboard
        </Button>
      </div>
    </RouteState>
  );
}
