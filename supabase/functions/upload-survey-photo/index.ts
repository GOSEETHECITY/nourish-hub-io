// Uploads a survey photo via token. Verifies token exists and survey isn't
// yet submitted, then writes to `impact-survey-photos/<survey_id>/<uuid>.<ext>`
// using the service role. Returns the storage path so the client can attach it
// to the survey submission.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { token, filename, content_type, data_base64 } = await req.json();

    if (!token || typeof token !== "string") return j({ error: "token required" }, 400);
    if (!data_base64 || typeof data_base64 !== "string") return j({ error: "data_base64 required" }, 400);
    if (data_base64.length > 8_000_000) return j({ error: "photo too large" }, 400);

    const { data: survey, error: sErr } = await admin
      .from("impact_surveys")
      .select("id, submitted_at")
      .eq("token", token)
      .maybeSingle();
    if (sErr || !survey) return j({ error: "invalid token" }, 404);
    if (survey.submitted_at) return j({ error: "already submitted" }, 400);

    const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    const declared = typeof content_type === "string" ? content_type.toLowerCase().trim() : "";
    if (!ALLOWED[declared]) return j({ error: "Only JPEG, PNG, or WebP images are allowed" }, 400);

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data_base64), (c) => c.charCodeAt(0));
    } catch {
      return j({ error: "invalid image data" }, 400);
    }
    const detected = sniffImageType(bytes);
    if (!detected || detected !== declared) return j({ error: "File is not a valid JPEG, PNG, or WebP image" }, 400);

    const ext = ALLOWED[detected];
    const path = `${survey.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await admin.storage
      .from("impact-survey-photos")
      .upload(path, bytes, { contentType: detected, upsert: false });
    if (upErr) return j({ error: upErr.message }, 500);

    return j({ path });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function sniffImageType(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
