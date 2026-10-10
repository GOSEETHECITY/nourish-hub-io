// Creates a Stripe Checkout session (or a PaymentIntent for embedded card
// element) for either a coupon order or a flash reservation.
// Uses Connect: destination = venue's stripe_account_id, application_fee = platform_fee_percentage.
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };
import { z } from "npm:zod@3.23.8";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

const BodySchema = z.object({
  kind: z.enum(["coupon", "flash"]),
  coupon_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(50).optional(),
  flash_listing_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  const userId = claims?.claims?.sub;
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const origin = req.headers.get("origin") ?? "https://hariet.ai";

  try {
    const { data: consumer } = await admin.from("consumers").select("id, email").eq("user_id", userId).maybeSingle();
    if (!consumer) throw new Error("No consumer profile");

    let unitAmount = 0;
    let quantity = 1;
    let orgId: string | null = null;
    let feePct = 10;
    let title = "";
    let metadata: Record<string, string> = { user_id: userId, kind: parsed.data.kind };

    if (parsed.data.kind === "coupon") {
      if (!parsed.data.coupon_id || !parsed.data.quantity) throw new Error("Missing coupon fields");
      const { data: coupon } = await admin.from("coupons")
        .select("id, title, price, organization_id, status, quantity_remaining")
        .eq("id", parsed.data.coupon_id).single();
      if (coupon.status !== "active") throw new Error("Coupon inactive");
      const remaining = Number(coupon.quantity_remaining ?? 0);
      if (remaining < parsed.data.quantity) {
        throw new Error(remaining <= 0
          ? "This deal is sold out"
          : `Only ${remaining} left. Please reduce your quantity.`);
      }
      unitAmount = Math.round(Number(coupon.price) * 100);
      quantity = parsed.data.quantity;
      orgId = coupon.organization_id;
      title = coupon.title;
      metadata.coupon_id = coupon.id;
      metadata.quantity = String(quantity);
    } else {
      if (!parsed.data.flash_listing_id) throw new Error("Missing flash_listing_id");
      const { data: listing } = await admin.from("food_listings")
        .select("id, organization_id, flash_price_cents, is_free_to_public, is_flash, pickup_window_end, notes")
        .eq("id", parsed.data.flash_listing_id).single();
      if (!listing.is_flash) throw new Error("Not a flash listing");
      if (new Date(listing.pickup_window_end) < new Date()) throw new Error("Flash window closed");
      unitAmount = Number(listing.flash_price_cents ?? 0);
      orgId = listing.organization_id;
      title = "Flash rescue";
      metadata.flash_listing_id = listing.id;
    }

    if (!orgId) throw new Error("No org");
    const { data: org } = await admin.from("organizations")
      .select("stripe_account_id, stripe_charges_enabled, platform_fee_percentage, name")
      .eq("id", orgId).single();
    feePct = Number(org.platform_fee_percentage ?? 10);

    const totalAmount = unitAmount * quantity;
    const appFee = Math.round(totalAmount * (feePct / 100));

    // Free flash listing: skip Stripe entirely, just reserve.
    if (parsed.data.kind === "flash" && unitAmount === 0) {
      const { data: resId, error: resErr } = await supabase.rpc("reserve_flash_listing", { p_listing_id: parsed.data.flash_listing_id });
      if (resErr) throw resErr;
      return new Response(JSON.stringify({ free: true, reservation_id: resId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!org.stripe_account_id || !org.stripe_charges_enabled) {
      throw new Error("Venue has not completed Stripe onboarding");
    }

    // Paid flash: atomically reserve for this user BEFORE any payment is created.
    let reservationId: string | null = null;
    if (parsed.data.kind === "flash") {
      const { data: resId, error: resErr } = await supabase.rpc("reserve_flash_listing", { p_listing_id: parsed.data.flash_listing_id });
      if (resErr) {
        if (/already reserved/i.test(resErr.message ?? "")) {
          return new Response(JSON.stringify({ error: "This flash listing has already been claimed" }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw resErr;
      }
      reservationId = resId as string;
      metadata.reservation_id = reservationId;
      // Unpaid checkout holds last 5 minutes (or until the window closes, if sooner).
      const { data: lst } = await admin.from("food_listings").select("pickup_window_end").eq("id", parsed.data.flash_listing_id).single();
      const holdEnd = Math.min(Date.now() + 5 * 60 * 1000, new Date(lst!.pickup_window_end).getTime());
      await admin.from("flash_reservations").update({ expires_at: new Date(holdEnd).toISOString() })
        .eq("id", reservationId).eq("status", "reserved");
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        // Stripe's shortest allowed session is 30 minutes; late payments are handled in the webhook.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60 + 60,
        customer_email: consumer.email ?? undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: title },
            unit_amount: unitAmount,
          },
          quantity,
        }],
        payment_intent_data: {
          application_fee_amount: appFee,
          transfer_data: { destination: org.stripe_account_id },
          metadata,
        },
        metadata,
        success_url: `${origin}/app/orders?session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/app/marketplace?cancelled=1`,
      });
    } catch (stripeErr) {
      // Release the hold so the listing isn't stuck if Stripe fails.
      if (reservationId) {
        await admin.from("flash_reservations")
          .update({ status: "released", released_at: new Date().toISOString() })
          .eq("id", reservationId).eq("status", "reserved");
      }
      throw stripeErr;
    }

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-checkout", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
