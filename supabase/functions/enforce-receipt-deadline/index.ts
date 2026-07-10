// Scheduled job: enforces the 72-hour tax-receipt rule.
// - Sends a 48h reminder to the nonprofit for picked-up donations without a receipt.
// - After 72h, notifies the venue and admins that the receipt is overdue.
// Idempotent: uses notifications.metadata.kind to avoid duplicates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    // Candidates: picked up but no tax receipt yet.
    const { data: rows, error } = await admin
      .from("food_listings")
      .select("id, organization_id, nonprofit_claimed_id, picked_up_at, pounds, food_type")
      .not("picked_up_at", "is", null)
      .in("status", ["picked_up", "pending_impact_report", "completed"]);
    if (error) return json({ error: error.message }, 500);

    const listingIds = (rows || []).map((r: any) => r.id);
    if (!listingIds.length) return json({ processed: 0 });

    const { data: existingReceipts } = await admin
      .from("tax_receipts").select("food_listing_id").in("food_listing_id", listingIds);
    const withReceipt = new Set((existingReceipts || []).map((r: any) => r.food_listing_id));

    const pending = (rows || []).filter((r: any) => !withReceipt.has(r.id));
    const now = Date.now();

    let reminders = 0, overdue = 0;
    for (const r of pending as any[]) {
      const ageMs = now - new Date(r.picked_up_at).getTime();
      const ageH = ageMs / 3_600_000;

      if (ageH >= 48 && ageH < 72) {
        // 48h reminder to nonprofit
        const kind = `receipt_reminder_48:${r.id}`;
        const { data: dupe } = await admin
          .from("notifications").select("id").contains("metadata", { kind }).limit(1).maybeSingle();
        if (!dupe) {
          const { data: profiles } = await admin
            .from("profiles").select("id").eq("nonprofit_id", r.nonprofit_claimed_id);
          for (const p of (profiles || [])) {
            await admin.from("notifications").insert({
              user_id: p.id,
              type: "tax_receipt_reminder",
              title: "Tax receipt due in 24 hours",
              body: `Submit the tax receipt for your recent donation (${r.pounds || "?"} lbs) within 24 hours.`,
              link_path: "/nonprofit/claimed",
              metadata: { kind, listing_id: r.id },
            });
          }
          reminders++;
        }
      } else if (ageH >= 72) {
        // Overdue: notify venue org + admins (once)
        const kind = `receipt_overdue:${r.id}`;
        const { data: dupe } = await admin
          .from("notifications").select("id").contains("metadata", { kind }).limit(1).maybeSingle();
        if (!dupe) {
          const { data: venueProfiles } = await admin
            .from("profiles").select("id").eq("organization_id", r.organization_id);
          for (const p of (venueProfiles || [])) {
            await admin.from("notifications").insert({
              user_id: p.id,
              organization_id: r.organization_id,
              type: "tax_receipt_overdue",
              title: "Tax receipt overdue",
              body: "The nonprofit that claimed your donation has not submitted a tax receipt within 72 hours.",
              link_path: "/venue/donations",
              metadata: { kind, listing_id: r.id },
            });
          }
          const { data: admins } = await admin
            .from("user_roles").select("user_id").eq("role", "admin");
          for (const a of (admins || [])) {
            await admin.from("notifications").insert({
              user_id: a.user_id,
              type: "tax_receipt_overdue",
              title: "Tax receipt overdue",
              body: `Donation ${r.id.slice(0, 8)} has no tax receipt >72h after pickup.`,
              link_path: "/donations",
              metadata: { kind, listing_id: r.id },
            });
          }
          overdue++;
        }
      }
    }

    return json({ processed: pending.length, reminders, overdue });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
