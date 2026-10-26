import { Compass } from "lucide-react";
import RouteState from "@/components/ui/RouteState";
import Button from "@/components/ui/Button";

export const metadata = { title: "Page not found" };

export default function WorkspaceNotFound() {
  return (
    <RouteState
      icon={Compass}
      eyebrow="404"
      title="That page is not in the workspace."
    >
      <p>
        The address may be wrong, or the lesson or exploration may no longer be
        published. Nothing was invented to fill the gap.
      </p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Button href="/dashboard">Go to dashboard</Button>
        <Button href="/learn" variant="secondary">
          Open curriculum
        </Button>
      </div>
    </RouteState>
  );
}
