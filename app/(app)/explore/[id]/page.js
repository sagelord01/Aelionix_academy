import { notFound } from "next/navigation";
import ExplorationWorkspace from "@/components/explore/ExplorationWorkspace";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { getAiConfig, getExecutionConfig } from "@/lib/config/env";
import {
  getExplorationConversation,
  getExplorationSession,
} from "@/lib/data/tutor";

export const metadata = { title: "Exploration" };

export default async function ExplorationPage({ params }) {
  const { id } = await params;
  const { supabase, user } = await requireOnboardedUser();

  const session = await getExplorationSession(supabase, user.id, id);
  if (!session) notFound();

  const [partner, coach] = await Promise.all([
    getExplorationConversation(supabase, user.id, session.id, "partner"),
    getExplorationConversation(supabase, user.id, session.id, "coach"),
  ]);

  return (
    <ExplorationWorkspace
      key={session.id}
      session={session}
      tutor={{ partner, coach }}
      executionConfigured={getExecutionConfig().configured}
      aiConfigured={getAiConfig().configured}
    />
  );
}
