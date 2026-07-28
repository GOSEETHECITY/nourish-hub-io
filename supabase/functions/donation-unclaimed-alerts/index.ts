// Hourly job. Two idempotent alerts:
//  1. unclaimed_4h  -> notify admins (in-app + email) 4h after posting
//  2. venue_2h_left -> notify the venue 2h before the pickup window closes
// Idempotency is enforced by the unique (food_listing_id, alert_type) index on
// public.donation_alerts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { internalCors, requireCronSecret, alertFatalError } from "../_shared/ops.ts";

const FN = "donation-unclaimed-alerts";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...internalCors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: internalCors });
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL") || "hello@goseethecity.com";

  try {
    const now = Date.now();
    const fourHoursAgo = new Date(now - 4 * 3600_000).toISOString();
    const inTwoHours = new Date(now + 2 * 3600_000).toISOString();

    const { data: listings, error } = await admin
      .from("food_listings")
      .select("id, organization_id, pounds, created_at, pickup_window_end, status, nonprofit_claimed_id, listing_type")
      .eq("listing_type", "donation")
      .is("nonprofit_claimed_id", null)
      .in("status", ["posted"]);
    if (error) throw error;

    const ids = (listings ?? []).map((l: any) => l.id);
    const { data: alreadySent } = ids.length
      ? await admin.from("donation_alerts").select("food_listing_id, alert_type").in("food_listing_id", ids)
      : { data: [] as any[] };
    const sentKeys = new Set((alreadySent ?? []).map((a: any) => `${a.food_listing_id}|${a.alert_type}`));

    const orgIds = [...new Set((listings ?? []).map((l: any) => l.organization_id).filter(Boolean))];
    const { data: orgs } = orgIds.length
      ? await admin.from("organizations").select("id, name").in("id", orgIds)
      : { data: [] as any[] };
    const orgName = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));

    // admin recipients
    const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (adminRoles ?? []).map((r: any) => r.user_id);

    let adminAlerts = 0;
    let venueAlerts = 0;

    for (const l of (listings ?? []) as any[]) {
      const venue = orgName.get(l.organization_id) ?? "A venue";
      const lbs = l.pounds ? `${l.pounds} lb` : "unknown weight";

      // --- 1. unclaimed 4h after posting -> admins
      if (l.created_at && l.created_at < fourHoursAgo && !sentKeys.has(`${l.id}|unclaimed_4h`)) {
        const { error: dupe } = await admin
          .from("donation_alerts")
          .insert({ food_listing_id: l.id, alert_type: "unclaimed_4h" });
        if (!dupe) {
          if (adminIds.length) {
            await admin.from("notifications").insert(
              adminIds.map((uid: string) => ({
                user_id: uid,
                type: "donation_unclaimed",
                title: "Donation still unclaimed",
                body: `${venue} posted ${lbs} over 4 hours ago and no nonprofit has claimed it.`,
                link_path: "/admin/donations",
                metadata: { listing_id: l.id },
              }))
            );
          }
          if (RESEND_API_KEY) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: "HarietAI Alerts <noreply@hariet.ai>",
                to: [ALERT_EMAIL],
                subject: `Unclaimed donation: ${venue}`,
                html: `<p><strong>${venue}</strong> posted a donation (${lbs}) more than 4 hours ago and it is still unclaimed.</p>
                       <p>Pickup window ends: ${l.pickup_window_end ?? "not set"}</p>
                       <p><a href="https://hariet.ai/admin/donations">Open admin donations</a></p>`,
              }),
            }).catch(() => {});
          }
          adminAlerts++;
        }
      }

      // --- 2. still unclaimed, 2h before pickup window ends -> venue
      if (
        l.pickup_window_end &&
        l.pickup_window_end <= inTwoHours &&
        new Date(l.pickup_window_end).getTime() > now &&
        !sentKeys.has(`${l.id}|venue_2h_left`)
      ) {
        const { error: dupe } = await admin
          .from("donation_alerts")
          .insert({ food_listing_id: l.id, alert_type: "venue_2h_left" });
        if (!dupe) {
          await admin.rpc("notify_org_members", {
            p_org_id: l.organization_id,
            p_type: "donation_expiring",
            p_title: "Donation expiring soon",
            p_body: `Your donation (${lbs}) is still unclaimed and the pickup window closes in under 2 hours.`,
            p_link: "/venue/donations",
            p_metadata: { listing_id: l.id },
          });
          venueAlerts++;
        }
      }
    }

    return json({ ok: true, scanned: listings?.length ?? 0, adminAlerts, venueAlerts });
  } catch (e) {
    await alertFatalError(FN, e);
    return json({ error: String(e) }, 500);
  }
});
