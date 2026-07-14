// Venue verifies the 6-char pickup code and marks the order picked up.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { order_id, pickup_code, action } = await req.json();
    if (!order_id) return json({ error: "order_id required" }, 400);

    const { data: order } = await admin.from("consumer_orders")
      .select("id, pickup_code, status, organization_id, consumer_id, food_listing_id, coupon_id")
      .eq("id", order_id).maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);

    // Verify the caller is a venue user for this order's org
    const { data: prof } = await admin.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
    if (!prof || prof.organization_id !== order.organization_id) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }

    if (action === "ready") {
      await admin.from("consumer_orders").update({ status: "ready", ready_at: new Date().toISOString() }).eq("id", order_id);
      // notify consumer
      const { data: c } = await admin.from("consumers").select("user_id").eq("id", order.consumer_id).maybeSingle();
      if (c?.user_id) {
        await admin.from("notifications").insert({
          user_id: c.user_id, type: "order_ready", title: "Your order is ready!",
          body: `Pickup code: ${order.pickup_code}. Show this to the venue at pickup.`,
          link_path: "/app/orders",
        });
      }
      return json({ ok: true, status: "ready" });
    }

    // Otherwise it's the pickup verification
    if (!pickup_code || String(pickup_code).trim().toUpperCase() !== order.pickup_code) {
      return json({ error: "Pickup code did not match" }, 400);
    }
    await admin.from("consumer_orders").update({ status: "picked_up", picked_up_at: new Date().toISOString() }).eq("id", order_id);
    const { data: c } = await admin.from("consumers").select("user_id").eq("id", order.consumer_id).maybeSingle();
    if (c?.user_id) {
      await admin.from("notifications").insert({
        user_id: c.user_id, type: "order_picked_up", title: "Order picked up",
        body: "Thanks for rescuing food today! We hope you enjoy it.",
        link_path: "/app/orders",
      });
    }
    return json({ ok: true, status: "picked_up" });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}
