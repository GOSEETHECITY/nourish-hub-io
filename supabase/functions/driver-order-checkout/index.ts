// Nonprofit driver ordering. action "quote" returns the estimated delivery fee;
// action "checkout" creates a driver_orders row and a Stripe Checkout session
// the nonprofit pays before anything is dispatched. Live courier quotes are not
// wired yet, so the estimate comes from app_config (no cap is applied).
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  action: z.enum(["quote", "checkout"]),
  provider: z.enum(["uber", "doordash"]),
  pickup_kind: z.enum(["one_time", "monthly_bulk"]),
  food_listing_id: z.string().uuid().optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pickup_notes: z.string().max(1000).optional(),
});
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function miles(a: number, b: number, c: number, d: number) {
  const R = 3958.8, t = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  const userId = claims?.claims?.sub;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: profile } = await admin.from("profiles").select("nonprofit_id").eq("id", userId).maybeSingle();
    const npId = profile?.nonprofit_id;
    if (!npId) return json({ error: "Only nonprofit members can order drivers" }, 403);

    let listing: any = null;
    if (b.pickup_kind === "one_time") {
      if (!b.food_listing_id) return json({ error: "food_listing_id required" }, 400);
      const { data } = await admin.from("food_listings").select("id, nonprofit_claimed_id, status, latitude, longitude").eq("id", b.food_listing_id).maybeSingle();
      if (!data || data.nonprofit_claimed_id !== npId || data.status !== "claimed") return json({ error: "You can only order a driver for a donation you have claimed" }, 400);
      listing = data;
    } else {
      if (!b.scheduled_date) return json({ error: "Choose a pickup date" }, 400);
      if (b.scheduled_date <= new Date().toISOString().slice(0, 10)) return json({ error: "Pickup date must be in the future" }, 400);
    }

    // Fee estimate (configurable; replace with live courier quotes once the APIs are connected).
    const { data: cfg } = await admin.from("app_config").select("key, value").in("key", ["driver_fee_base_cents", "driver_fee_per_mile_cents", "driver_bulk_fee_cents"]);
    const c = Object.fromEntries((cfg ?? []).map((r: any) => [r.key, Number(r.value)]));
    const base = c.driver_fee_base_cents || 999, perMile = c.driver_fee_per_mile_cents || 150, bulk = c.driver_bulk_fee_cents || 4999;
    let fee = bulk;
    let distance: number | null = null;
    if (listing) {
      const { data: s } = await admin.from("nonprofit_alert_settings").select("latitude, longitude").eq("nonprofit_id", npId).maybeSingle();
      if (s?.latitude != null && listing.latitude != null) distance = miles(Number(s.latitude), Number(s.longitude), Number(listing.latitude), Number(listing.longitude));
      fee = base + Math.round((distance ?? 5) * perMile);
    }
    if (b.action === "quote") return json({ estimated_fee_cents: fee, distance_miles: distance, estimate_source: "platform_estimate" });

    const { data: existing } = listing
      ? await admin.from("driver_orders").select("id, status").eq("food_listing_id", listing.id).in("status", ["paid", "dispatched"]).limit(1)
      : { data: [] as any[] };
    if (existing?.length) return json({ error: "A driver is already booked for this donation" }, 409);

    const { data: order, error: oErr } = await admin.from("driver_orders").insert({
      food_listing_id: listing?.id ?? null, nonprofit_id: npId, provider: b.provider, pickup_kind: b.pickup_kind,
      scheduled_date: b.scheduled_date ?? null, pickup_notes: b.pickup_notes ?? null, estimated_fee_cents: fee,
      fulfillment_mode: b.provider === "uber" ? "uber_deeplink" : "manual", created_by: userId,
    }).select("id").single();
    if (oErr) throw oErr;

    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return json({ error: "Payments are not configured yet" }, 503);
    const stripe = new Stripe(key, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") ?? "https://hariet.ai";
    const metadata = { kind: "driver_order", driver_order_id: order.id, user_id: userId };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", unit_amount: fee, product_data: { name: b.pickup_kind === "monthly_bulk" ? `Monthly bulk pickup (${b.scheduled_date})` : `Driver pickup (${b.provider === "uber" ? "Uber" : "DoorDash"})` } }, quantity: 1 }],
      metadata, payment_intent_data: { metadata },
      success_url: `${origin}/nonprofit/claimed?driver=paid`,
      cancel_url: `${origin}/nonprofit/claimed?driver=cancelled`,
    });
    await admin.from("driver_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    return json({ url: session.url, driver_order_id: order.id });
  } catch (e) {
    console.error("driver-order-checkout", e);
    return json({ error: String((e as any)?.message ?? e) }, 400);
  }
});
