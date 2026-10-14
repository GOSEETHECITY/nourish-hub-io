// Lightweight helpers for the online (self-serve) partner signup flow.
//
// Actions:
//   verify_ein      (public)  — checks an EIN against ProPublica/IRS records.
//   doc_upload_url  (auth)    — mints a signed upload URL for a partner document.
//
// Document registration happens inside complete-partner-signup at submit time,
// so uploads here are keyed by the applicant's user id and verified there.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { checkEin, onboardingCors, serviceClient } from "../_shared/onboarding.ts";

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

  // ---- Authenticated actions below ----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sign in required." }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: "Sign in required." }, 401);

  if (action === "doc_upload_url") {
    const name = String(body.file_name ?? "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-80);
    if (!/\.(pdf|png|jpe?g|webp|heic)$/i.test(name)) {
      return json({ error: "Upload a PDF or image file." }, 400);
    }
    const path = `${user.id}/${crypto.randomUUID()}-${name}`;
    const { data, error } = await db.storage.from("partner-documents").createSignedUploadUrl(path);
    if (error || !data) return json({ error: "Could not prepare upload. Please try again." }, 500);
    return json({ ok: true, path, token: data.token });
  }

  return json({ error: "Unknown action." }, 400);
});
