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

    const ext = (filename?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
    const path = `${survey.id}/${crypto.randomUUID()}.${ext}`;
    const bytes = Uint8Array.from(atob(data_base64), (c) => c.charCodeAt(0));

    const { error: upErr } = await admin.storage
      .from("impact-survey-photos")
      .upload(path, bytes, { contentType: content_type || "image/jpeg", upsert: false });
    if (upErr) return j({ error: upErr.message }, 500);

    return j({ path });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});
