import { describe, expect, it } from "vitest";
import {
  isAuthPath,
  isProtectedPath,
  PROTECTED_PREFIXES,
  safeNextPath,
} from "@/lib/auth/paths";

describe("safeNextPath", () => {
  it("accepts a same-origin path with query and hash", () => {
    expect(safeNextPath("/learn/loops?exercise=sum-of-evens#editor")).toBe(
      "/learn/loops?exercise=sum-of-evens#editor",
    );
  });

  it("rejects absolute URLs and protocol-relative paths", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
  });

  it("rejects paths that target the API", () => {
    expect(safeNextPath("/api/code/run")).toBe("/dashboard");
  });

  it("rejects whitespace injection", () => {
    expect(safeNextPath("/dashboard\nLocation: https://evil.example")).toBe(
      "/dashboard",
    );
    expect(safeNextPath("/dashboard\r\nX: y")).toBe("/dashboard");
  });

  it("uses the provided fallback", () => {
    expect(safeNextPath(null, "/login")).toBe("/login");
    expect(safeNextPath(42, "/login")).toBe("/login");
  });
});

describe("route classification", () => {
  it("protects every workspace prefix and its children", () => {
    for (const prefix of PROTECTED_PREFIXES) {
      expect(isProtectedPath(prefix)).toBe(true);
      expect(isProtectedPath(`${prefix}/child`)).toBe(true);
    }
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/pricing")).toBe(false);
  });

  it("skips the auth screens used to recover an account", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/signup")).toBe(true);
    expect(isAuthPath("/forgot-password")).toBe(true);
    expect(isAuthPath("/dashboard")).toBe(false);
  });
});
