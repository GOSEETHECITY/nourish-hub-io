// Invoked by a database trigger whenever a venue posts a donation.
// Sends an operations SMS via the Twilio connector gateway. Fire-and-forget:
// the trigger uses net.http_post so a failure here never blocks the insert.
import { createClient } from "npm:@supabase/supabase-js@2";
import { internalCors, requireCronSecret, alertFatalError } from "../_shared/ops.ts";

const FN = "donation-posted-sms";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...internalCors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: internalCors });
  const denied = requireCronSecret(req);
  if (denied) return denied;

  try {
    const { listing_id } = await req.json().catch(() => ({ listing_id: null }));
    if (!listing_id) return json({ error: "listing_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: listing } = await admin
      .from("food_listings")
      .select("id, pounds, pickup_window_start, organization_id")
      .eq("id", listing_id)
      .maybeSingle();
    if (!listing) return json({ error: "listing not found" }, 404);

    const { data: org } = await admin.from("organizations").select("name").eq("id", listing.organization_id).maybeSingle();
    const venue = org?.name ?? "A venue";
    const pounds = listing.pounds ? `${listing.pounds} lb` : "weight TBD";
    const pickup = listing.pickup_window_start
      ? new Date(listing.pickup_window_start).toLocaleString("en-US", { timeZone: "America/New_York" })
      : "pickup date TBD";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");
    const TO = Deno.env.get("OPS_SMS_NUMBER") || "+13529001505";

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) {
      return json({ ok: false, skipped: "twilio_not_configured" });
    }

    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: TO,
        From: TWILIO_FROM,
        Body: `New donation posted\n${venue}\n${pounds}\nPickup: ${pickup}`,
      }),
    });
    return json({ ok: res.ok, status: res.status });
  } catch (e) {
    await alertFatalError(FN, e);
    return json({ error: String(e) }, 500);
  }
});
