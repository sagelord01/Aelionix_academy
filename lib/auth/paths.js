export const PROTECTED_PREFIXES = [
  "/onboarding",
  "/assessment",
  "/dashboard",
  "/learn",
  "/explore",
  "/practice",
  "/review",
  "/progress",
  "/settings",
];

export function isProtectedPath(pathname) {
  if (!pathname) return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(pathname) {
  return pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";
}

export function safeNextPath(value, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (value.startsWith("/api/")) return fallback;
  if (value.includes("\n") || value.includes("\r")) return fallback;
  return value;
}
