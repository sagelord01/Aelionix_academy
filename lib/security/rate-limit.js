/**
 * Rate limiting is best-effort. The in-memory guard protects a single process
 * immediately; the usage_events table provides a shared counter for serverless
 * deployments. A production deployment with high concurrency should replace
 * the read-then-insert count with an atomic database function or a dedicated
 * limiter. This limitation is documented in the README.
 */

const memoryWindows = new Map();

export const RATE_LIMITS = {
  ai: { limit: 30, windowMs: 60 * 60 * 1000, label: "tutor messages" },
  execution: { limit: 30, windowMs: 60 * 60 * 1000, label: "code runs" },
  assessment: { limit: 80, windowMs: 60 * 60 * 1000, label: "assessment answers" },
  review: { limit: 80, windowMs: 60 * 60 * 1000, label: "review answers" },
  explore: { limit: 20, windowMs: 60 * 60 * 1000, label: "exploration sessions" },
};

function cleanupMemory(now) {
  if (memoryWindows.size < 5000) return;
  for (const [key, value] of memoryWindows.entries()) {
    if (value.resetAt <= now) memoryWindows.delete(key);
  }
}

export function checkMemoryRateLimit(
  key,
  { limit, windowMs },
  now = Date.now(),
) {
  const existing = memoryWindows.get(key);
  if (!existing || existing.resetAt <= now) {
    const entry = { count: 1, resetAt: now + windowMs };
    memoryWindows.set(key, entry);
    cleanupMemory(now);
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterMs: 0,
  };
}

export function resetMemoryRateLimits() {
  memoryWindows.clear();
}

export async function enforceRateLimit({
  admin,
  userId,
  kind,
  config = RATE_LIMITS[kind],
  now = new Date(),
}) {
  if (!config) throw new Error(`Unknown rate-limit kind: ${kind}`);

  const memory = checkMemoryRateLimit(`${userId}:${kind}`, config, now.getTime());
  if (!memory.allowed) {
    return {
      allowed: false,
      retryAfterMs: memory.retryAfterMs,
      limit: config.limit,
      message: `Too many ${config.label}. Try again in ${Math.max(
        1,
        Math.ceil(memory.retryAfterMs / 60000),
      )} minute(s).`,
    };
  }

  if (!admin) {
    return { allowed: true, retryAfterMs: 0, limit: config.limit, remaining: memory.remaining };
  }

  const since = new Date(now.getTime() - config.windowMs).toISOString();
  const { count, error } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", since);

  if (error) {
    // Do not block learning because the operational counter failed. The
    // in-memory guard still applies and the failure is visible in server logs.
    console.error("Rate-limit lookup failed:", error.message);
    return { allowed: true, retryAfterMs: 0, limit: config.limit, remaining: memory.remaining };
  }

  if ((count || 0) >= config.limit) {
    return {
      allowed: false,
      retryAfterMs: config.windowMs,
      limit: config.limit,
      message: `You have reached the ${config.label} limit for now. Try again later.`,
    };
  }

  await admin.from("usage_events").insert({
    user_id: userId,
    kind,
  });

  return {
    allowed: true,
    retryAfterMs: 0,
    limit: config.limit,
    remaining: Math.max(0, config.limit - (count || 0) - 1),
  };
}
