// Releases flash reservations whose expires_at has passed and status is still
// 'reserved' (no pickup confirmed). Runs on a 5-minute cron.
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data, error } = await admin
      .from("flash_reservations")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("status", "reserved")
      .lt("expires_at", new Date().toISOString())
      .select("id, food_listing_id, consumer_id");

    if (error) throw error;

    // Notify consumers whose reservations expired.
    if (data && data.length) {
      const rows = data.map((r: any) => ({
        user_id: null, // resolved below via consumer -> user
        type: "flash_expired",
        title: "Flash pickup expired",
        body: "Your flash reservation was released because pickup wasn't confirmed in time.",
        link_path: "/app/events",
        metadata: { listing_id: r.food_listing_id, reservation_id: r.id },
      }));
      for (let i = 0; i < data.length; i++) {
        const r: any = data[i];
        const { data: consumer } = await admin.from("consumers").select("user_id").eq("id", r.consumer_id).maybeSingle();
        if (consumer?.user_id) {
          await admin.from("notifications").insert({ ...rows[i], user_id: consumer.user_id });
        }
      }
    }

    return new Response(JSON.stringify({ released: data?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("release-expired-flash-reservations failed", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
