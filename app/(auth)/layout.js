export const metadata = {
  title: {
    template: "%s · Aelionix Academy",
    default: "Account · Aelionix Academy",
  },
};

// Auth pages depend on the current session and runtime integration status.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }) {
  return children;
}
