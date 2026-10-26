"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChartNoAxesColumn,
  Compass,
  Dumbbell,
  LayoutDashboard,
  Layers,
  LogOut,
  Settings,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { signOutAction } from "@/lib/auth/actions";
import styles from "./AppShell.module.css";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/learn", label: "Curriculum", icon: BookOpen },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/review", label: "Review", icon: Layers },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ profile, children }) {
  const pathname = usePathname();
  const modeLabel = profile?.preferred_mode === "partner" ? "Coding Partner" : "Coach";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo />
        </div>

        <nav className={styles.nav} aria-label="Workspace">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${isActive(pathname, href) ? styles.active : ""}`}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              aria-label={label}
            >
              <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <Link
            href="/settings"
            className={styles.profile}
            aria-label={`Account settings for ${profile?.display_name || "learner"}`}
          >
            <span className={styles.avatar} aria-hidden="true">
              {(profile?.display_name || "L").slice(0, 1).toUpperCase()}
            </span>
            <span className={styles.profileText}>
              <span className={styles.profileName}>
                {profile?.display_name || "Learner"}
              </span>
              <span className={styles.profileMeta}>{modeLabel} mode</span>
            </span>
            <Settings size={15} strokeWidth={1.6} aria-hidden="true" />
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={styles.signOut} aria-label="Sign out">
              <LogOut size={15} strokeWidth={1.6} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      <main id="main-content" className={styles.main}>{children}</main>
    </div>
  );
}
