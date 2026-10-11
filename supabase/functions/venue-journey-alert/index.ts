// Invoked by the food_listings trigger at each donation journey stage
// (claimed, on the way, on site, picked up). Emails the venue's members.
import { createClient } from "npm:@supabase/supabase-js@2";
import { internalCors, requireCronSecret, alertFatalError } from "../_shared/ops.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...internalCors, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: internalCors });
  const denied = requireCronSecret(req);
  if (denied) return denied;
  try {
    const { organization_id, title, body } = await req.json().catch(() => ({}));
    if (typeof organization_id !== "string" || typeof title !== "string" || typeof body !== "string") return json({ error: "bad request" }, 400);
    const RESEND = Deno.env.get("RESEND_API_KEY");
    if (!RESEND) return json({ skipped: "resend_not_configured" });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: members } = await admin.from("profiles").select("id, email").eq("organization_id", organization_id);
    const ids = (members ?? []).map((m) => m.id);
    const { data: prefs } = ids.length
      ? await admin.from("notification_preferences").select("user_id, email_enabled").in("user_id", ids).eq("category", "donation_journey")
      : { data: [] as any[] };
    const off = new Set((prefs ?? []).filter((p: any) => !p.email_enabled).map((p: any) => p.user_id));
    let sent = 0;
    for (const m of members ?? []) {
      if (!m.email || off.has(m.id)) continue;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "HarietAI <noreply@hariet.ai>", to: [m.email], subject: title,
          html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>${esc(title)}</h2><p>${esc(body)}</p><p><a href="https://hariet.ai/venue">Open your dashboard</a></p></div>`,
        }),
      }).catch(() => null);
      if (r?.ok) sent++;
    }
    return json({ ok: true, sent });
  } catch (e) {
    await alertFatalError("venue-journey-alert", e);
    return json({ error: String(e) }, 500);
  }
});
