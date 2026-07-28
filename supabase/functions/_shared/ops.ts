// Shared operational helpers: restricted CORS, cron-secret auth, fatal-error
// alerting and a simple in-memory rate limiter.

const ALLOWED_ORIGINS = ["https://hariet.ai", "https://www.hariet.ai"];

/** CORS headers restricted to the production admin origin. */
export function restrictedCors(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/** Headers for internal-only functions (cron / triggers). No browser access. */
export const internalCors = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Headers": "content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Returns a 401 Response when the caller did not present the CRON_SECRET.
 * Returns null when the caller is authorized.
 */
export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

/**
 * Emails hello@goseethecity.com when an edge function hits a fatal error.
 * Never throws — alerting must never break the calling function.
 */
export async function alertFatalError(fnName: string, err: unknown, context?: unknown) {
  try {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return;
    const to = Deno.env.get("ALERT_EMAIL") || "hello@goseethecity.com";
    const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : String(err);
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "HarietAI Alerts <noreply@hariet.ai>",
        to: [to],
        subject: `ALERT Function Error: ${fnName}`,
        html: `<div style="font-family:Arial,sans-serif">
          <h2>Edge function failure</h2>
          <p><strong>Function:</strong> ${escapeHtml(fnName)}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(message).slice(0, 4000)}</pre>
          ${context ? `<pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(JSON.stringify(context)).slice(0, 2000)}</pre>` : ""}
        </div>`,
      }),
    });
  } catch (_) {
    // swallow — alerting must never block the original function
  }
}

export function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

/** Simple per-IP fixed-window rate limiter. */
export function makeRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
  }, Math.max(windowMs, 60_000));
  return (key: string): boolean => {
    const now = Date.now();
    const cur = hits.get(key);
    if (!cur || now > cur.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    cur.count++;
    return cur.count > max;
  };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Cryptographically random temporary password, unique per organization. */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const pick = (set: string, i: number) => set[bytes[i] % set.length];
  const chars = [pick(upper, 0), pick(lower, 1), pick(digits, 2), pick(symbols, 3)];
  for (let i = 4; i < 20; i++) chars.push(pick(all, i));
  // shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
