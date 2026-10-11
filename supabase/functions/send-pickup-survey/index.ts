// Emails the post-pickup survey link (/survey/:token) to the claiming nonprofit.
// Called from the create_survey_on_pickup DB trigger via invoke_scheduled_function.
// Auth: X-Cron-Secret must match CRON_SECRET. Recipients are resolved server side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { requireCronSecret } from "../_shared/ops.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  const denied = requireCronSecret(req);
  if (denied) return denied;
  try {
    const { listing_id } = await req.json().catch(() => ({}));
    if (typeof listing_id !== "string" || !UUID_RE.test(listing_id)) return json({ error: "listing_id must be a UUID" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: survey } = await admin.from("impact_surveys").select("token, nonprofit_id, submitted_at, venue_organization_id").eq("food_listing_id", listing_id).maybeSingle();
    if (!survey) return json({ error: "survey not found" }, 404);
    if (survey.submitted_at) return json({ skipped: "already submitted" });

    const emails = new Set<string>();
    const { data: profiles } = await admin.from("profiles").select("email").eq("nonprofit_id", survey.nonprofit_id);
    for (const p of profiles ?? []) if (p.email) emails.add(p.email.toLowerCase());
    if (!emails.size) {
      const { data: np } = await admin.from("nonprofits").select("primary_contact_email").eq("id", survey.nonprofit_id).maybeSingle();
      if (np?.primary_contact_email) emails.add(np.primary_contact_email.toLowerCase());
    }
    if (!emails.size) return json({ skipped: "no recipients" });

    const { data: venue } = await admin.from("organizations").select("name").eq("id", survey.venue_organization_id).maybeSingle();
    const link = `https://hariet.ai/survey/${survey.token}`;
    const venueName = esc(venue?.name || "your donor");
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#000">
      <h2>Thanks for picking up the donation from ${venueName}!</h2>
      <p>Please take 2 minutes to complete the pickup survey and upload a few photos. It shows the donor how their food helped.</p>
      <p><a href="${link}" style="display:inline-block;background:#6d412a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Complete pickup survey + upload photos</a></p>
      <p style="font-size:12px;color:#555">Or open this link: ${link}</p></div>`;

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return json({ error: "RESEND_API_KEY not configured" }, 500);
    let sent = 0;
    for (const to of emails) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "HarietAI <noreply@hariet.ai>", to: [to], subject: "Complete your pickup survey", html }),
      });
      if (res.ok) sent++; else console.error("resend failed", res.status, await res.text());
    }
    return json({ sent });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
