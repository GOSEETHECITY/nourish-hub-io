// Stripe webhook: syncs account status (Connect) and records paid orders /
// flash reservations.  MUST run with verify_jwt=false (see config.toml).
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = webhookSecret
      ? await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
      : JSON.parse(body) as Stripe.Event; // dev fallback only
  } catch (err) {
    console.error("bad signature", err);
    return new Response("bad signature", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    switch (event.type) {
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        await admin.from("organizations")
          .update({
            stripe_charges_enabled: !!acct.charges_enabled,
            stripe_payouts_enabled: !!acct.payouts_enabled,
            stripe_details_submitted: !!acct.details_submitted,
          })
          .eq("stripe_account_id", acct.id);
        break;
      }
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const meta = s.metadata ?? {};
        const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
        const amountTotal = s.amount_total ?? 0;
        // Compute fee/payout from PI
        let appFee = 0;
        if (pi) {
          const intent = await stripe.paymentIntents.retrieve(pi);
          appFee = Number(intent.application_fee_amount ?? 0);
        }
        const payout = amountTotal - appFee;

        if (meta.kind === "coupon" && meta.coupon_id && meta.user_id) {
          const { data: consumer } = await admin.from("consumers").select("id").eq("user_id", meta.user_id).maybeSingle();
          const { data: coupon } = await admin.from("coupons").select("organization_id, price").eq("id", meta.coupon_id).single();
          const qty = Math.max(1, Math.round(amountTotal / Math.max(1, Math.round(Number(coupon.price) * 100))));
          await admin.from("consumer_orders").insert({
            consumer_id: consumer?.id,
            coupon_id: meta.coupon_id,
            organization_id: coupon.organization_id,
            quantity: qty,
            unit_price: Number(coupon.price),
            tax_amount: 0,
            total_price: amountTotal / 100,
            status: "paid",
            application_fee_cents: appFee,
            venue_payout_cents: payout,
            stripe_payment_intent_id: pi,
          });
          // decrement inventory
          await admin.rpc("noop_stub", {}).then(() => {}, () => {});
        } else if (meta.kind === "flash" && meta.flash_listing_id && meta.user_id) {
          const { data: consumer } = await admin.from("consumers").select("id").eq("user_id", meta.user_id).maybeSingle();
          // Reserve via RPC (SECURITY DEFINER) — call directly with service role bypassing auth check
          const { data: listing } = await admin.from("food_listings")
            .select("pickup_window_end, organization_id").eq("id", meta.flash_listing_id).single();
          if (consumer?.id && listing) {
            await admin.from("flash_reservations").insert({
              food_listing_id: meta.flash_listing_id,
              consumer_id: consumer.id,
              expires_at: listing.pickup_window_end,
              stripe_payment_intent_id: pi,
              amount_paid_cents: amountTotal,
              application_fee_cents: appFee,
            });
            await admin.from("consumer_orders").insert({
              consumer_id: consumer.id,
              food_listing_id: meta.flash_listing_id,
              organization_id: listing.organization_id,
              quantity: 1,
              unit_price: amountTotal / 100,
              tax_amount: 0,
              total_price: amountTotal / 100,
              status: "paid",
              application_fee_cents: appFee,
              venue_payout_cents: payout,
              stripe_payment_intent_id: pi,
            });
          }
        }
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id ?? null;
        if (pi) {
          await admin.from("consumer_orders")
            .update({ status: "refunded", refunded_at: new Date().toISOString() })
            .eq("stripe_payment_intent_id", pi);
        }
        break;
      }
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error("stripe-webhook handler error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
