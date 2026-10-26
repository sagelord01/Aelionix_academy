export const metadata = {
  title: {
    template: "%s · Learning Workspace",
    default: "Account · Learning Workspace",
  },
};

// Auth pages depend on the current session and runtime integration status.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }) {
  return children;
}
