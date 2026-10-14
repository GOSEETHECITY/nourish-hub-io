// Lightweight helpers for the online (self-serve) partner signup flow.
//
// Both actions are PUBLIC (no sign-in yet at signup time):
//   verify_ein      — checks an EIN against ProPublica/IRS records.
//   doc_upload_url  — mints a signed upload URL for a partner document.
//
// Uploads happen BEFORE the auth account is created, so a failed upload
// never orphans an account. Uploaded files live under an unguessable
// `signup/<uuid>/` prefix and are only linked to an organization when
// complete-partner-signup registers them at submit time; anything never
// referenced stays orphaned and inert.
//
// Abuse controls (no auth available pre-signup): per-IP rate limits, a
// PDF/image allowlist, and a 10 MB cap on the eventual upload. The signed
// URL itself is single-use and short-lived (Supabase default).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { checkEin, onboardingCors, serviceClient } from "../_shared/onboarding.ts";
import { makeRateLimiter, clientIp } from "../_shared/ops.ts";

const ALLOWED_ORIGINS = [
  "https://hariet.ai",
  "https://www.hariet.ai",
  "https://goseethecity.com",
  "https://www.goseethecity.com",
];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    ...onboardingCors(req),
    "Access-Control-Allow-Origin": allowed,
  };
}

// 10 EIN checks per IP per minute (parity with validate-signup).
const einLimiter = makeRateLimiter(10, 60_000);
// 10 document upload preparations per IP per 10 minutes.
const uploadLimiter = makeRateLimiter(10, 600_000);

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const action = String(body.action ?? "");

  const db = serviceClient();

  if (action === "verify_ein") {
    if (einLimiter(clientIp(req))) {
      return json({ error: "Too many attempts. Please wait a minute and try again." }, 429);
    }
    const ein = String(body.ein ?? "").replace(/\D/g, "");
    if (ein.length !== 9) {
      return json({ error: "Enter your 9-digit EIN (for example 12-3456789)." }, 400);
    }
    const { data: dupNp } = await db.from("nonprofits").select("id").eq("ein", ein).limit(1);
    if (dupNp?.length) {
      return json(
        { error: "An account already exists for this EIN. Contact support at hello@hariet.ai.", duplicate: true },
        409,
      );
    }
    const r = await checkEin(ein);
    return json({ ok: true, ein_status: r.status, reason: r.reason, irs_name: r.name ?? null });
  }

  if (action === "doc_upload_url") {
    if (uploadLimiter(clientIp(req))) {
      return json({ error: "Too many uploads. Please wait a few minutes and try again." }, 429);
    }
    const name = String(body.file_name ?? "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-80);
    if (!/\.(pdf|png|jpe?g|webp|heic)$/i.test(name)) {
      return json({ error: "Upload a PDF or image file." }, 400);
    }
    // No user id yet (pre-signup): key by an unguessable signup-scoped prefix.
    const path = `signup/${crypto.randomUUID()}/${name}`;
    const { data, error } = await db.storage.from("partner-documents").createSignedUploadUrl(path);
    if (error || !data) return json({ error: "Could not prepare upload. Please try again." }, 500);
    return json({ ok: true, path, token: data.token });
  }

  return json({ error: "Unknown action." }, 400);
});
