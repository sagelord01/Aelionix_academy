import { LoaderCircle } from "lucide-react";
import RouteState from "@/components/ui/RouteState";
import Spinner from "@/components/ui/Spinner";

export default function WorkspaceLoading() {
  return (
    <RouteState
      icon={LoaderCircle}
      eyebrow="Workspace"
      title="Loading your evidence"
    >
      <p>
        Reading lessons, progress, and schedules from the configured database.
        Nothing is shown until it has been loaded.
      </p>
      <p style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Spinner size={16} label="Loading workspace" />
        <span style={{ color: "var(--text-faint)", fontSize: "0.72rem" }}>
          This should only take a moment.
        </span>
      </p>
    </RouteState>
  );
}
