import AppShell from "@/components/app/AppShell";
import { getProfile, requireUser } from "@/lib/auth/guards";

// Every workspace route depends on the request's session cookies.
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }) {
  const { supabase, user } = await requireUser();
  let profile = null;
  try {
    profile = await getProfile(supabase, user.id);
  } catch {
    profile = null;
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
