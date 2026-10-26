import PublicShell from "@/components/public/PublicShell";
import { getOptionalUser } from "@/lib/auth/guards";

// The public shell reflects the current session, so it is request-scoped.
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }) {
  const user = await getOptionalUser();
  return <PublicShell signedIn={Boolean(user)}>{children}</PublicShell>;
}
