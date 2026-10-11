// Invoked by a database trigger when a donation posts. Emails and texts (Vonage)
// every nonprofit whose saved alert radius covers the pickup location.
import { createClient } from "npm:@supabase/supabase-js@2";
import { internalCors, requireCronSecret, alertFatalError } from "../_shared/ops.ts";

const FN = "nonprofit-donation-alerts";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...internalCors, "Content-Type": "application/json" } });

function miles(a: number, b: number, c: number, d: number) {
  const R = 3958.8, toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(c - a), dLon = toR(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a)) * Math.cos(toR(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: internalCors });
  const denied = requireCronSecret(req);
  if (denied) return denied;
  try {
    const { listing_id } = await req.json().catch(() => ({ listing_id: null }));
    if (typeof listing_id !== "string") return json({ error: "listing_id required" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Coordinates are inherited from the location by trigger; wait briefly if not yet set.
    let listing: any = null;
    for (let i = 0; i < 3; i++) {
      const { data } = await admin.from("food_listings")
        .select("id, organization_id, pounds, food_type, latitude, longitude, pickup_window_start, status, listing_type")
        .eq("id", listing_id).maybeSingle();
      listing = data;
      if (!listing || (listing.latitude != null && listing.longitude != null)) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (!listing || listing.listing_type !== "donation" || listing.status !== "posted") return json({ skipped: "not_posted" });
    if (listing.latitude == null || listing.longitude == null) return json({ skipped: "no_coordinates" });
    const lat = Number(listing.latitude), lng = Number(listing.longitude);

    const { data: org } = await admin.from("organizations").select("name").eq("id", listing.organization_id).maybeSingle();
    const venue = org?.name ?? "A venue";
    const lbs = listing.pounds ? `${listing.pounds} lb` : "weight TBD";
    const food = listing.food_type ? String(listing.food_type).replace(/_/g, " ") : "food";
    const when = listing.pickup_window_start
      ? new Date(listing.pickup_window_start).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "short" }) + " ET"
      : "TBD";

    const { data: settings } = await admin.from("nonprofit_alert_settings")
      .select("nonprofit_id, radius_miles, email_enabled, sms_enabled, alert_email, alert_phone, latitude, longitude")
      .not("latitude", "is", null).not("longitude", "is", null);
    const npIds = (settings ?? []).map((s) => s.nonprofit_id);
    const { data: nps } = npIds.length
      ? await admin.from("nonprofits").select("id, approval_status, primary_contact_email, primary_contact_phone").in("id", npIds)
      : { data: [] as any[] };
    const npMap = new Map((nps ?? []).map((n: any) => [n.id, n]));

    const RESEND = Deno.env.get("RESEND_API_KEY");
    const V_KEY = Deno.env.get("VONAGE_API_KEY");
    const V_SECRET = Deno.env.get("VONAGE_API_SECRET");
    const V_FROM = Deno.env.get("VONAGE_FROM_NUMBER") || "HarietAI";
    let emails = 0, sms = 0, matched = 0;

    for (const s of settings ?? []) {
      const np: any = npMap.get(s.nonprofit_id);
      if (!np || np.approval_status !== "approved") continue;
      const dist = miles(Number(s.latitude), Number(s.longitude), lat, lng);
      if (dist > (s.radius_miles ?? 25)) continue;
      matched++;
      const d = dist < 10 ? dist.toFixed(1) : Math.round(dist).toString();
      const text = `New donation ${d} mi away: ${venue}, ${lbs} ${food}. Pickup ${when}. Claim: https://hariet.ai/nonprofit/available`;

      const email = s.alert_email || np.primary_contact_email;
      if (s.email_enabled && email && RESEND) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "HarietAI <noreply@hariet.ai>", to: [email], subject: `New donation ${d} mi away: ${venue}`,
            html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>New donation near you</h2>
              <p><strong>${esc(venue)}</strong> posted ${esc(lbs)} of ${esc(food)}, ${d} miles from you.</p>
              <p>Pickup: ${esc(when)}</p><p><a href="https://hariet.ai/nonprofit/available">Claim it now</a></p></div>`,
          }),
        }).catch(() => null);
        if (r?.ok) emails++;
      }
      const phone = (s.alert_phone || np.primary_contact_phone || "").replace(/[^\d]/g, "");
      if (s.sms_enabled && phone && V_KEY && V_SECRET) {
        const to = phone.length === 10 ? `1${phone}` : phone;
        const r = await fetch("https://rest.nexmo.com/sms/json", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ api_key: V_KEY, api_secret: V_SECRET, from: V_FROM, to, text }),
        }).catch(() => null);
        const body = r ? await r.json().catch(() => null) : null;
        if (body?.messages?.[0]?.status === "0") sms++;
      }
    }
    return json({ ok: true, matched, emails, sms, vonage_configured: !!(V_KEY && V_SECRET) });
  } catch (e) {
    await alertFatalError(FN, e);
    return json({ error: String(e) }, 500);
  }
});
