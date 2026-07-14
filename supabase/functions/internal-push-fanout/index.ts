// Internal push fan-out. Called by DB triggers via pg_net.
// Auth: X-Internal-Secret header must match PUSH_INTERNAL_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:Hello@hariet.ai",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const INTERNAL = Deno.env.get("PUSH_INTERNAL_SECRET") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (INTERNAL && req.headers.get("X-Internal-Secret") !== INTERNAL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { audience, city, consumer_id, user_id, title, body, url } = await req.json();
    let subs: any[] = [];
    if (audience === "city" && city) {
      const { data } = await admin.from("push_subscriptions")
        .select("id,endpoint,p256dh,auth,consumer_id,consumers!inner(city)")
        .eq("consumers.city", city);
      subs = data ?? [];
    } else if (audience === "consumer" && consumer_id) {
      const { data } = await admin.from("push_subscriptions")
        .select("id,endpoint,p256dh,auth").eq("consumer_id", consumer_id);
      subs = data ?? [];
    } else if (audience === "user" && user_id) {
      const { data: c } = await admin.from("consumers").select("id").eq("user_id", user_id).maybeSingle();
      if (c) {
        const { data } = await admin.from("push_subscriptions")
          .select("id,endpoint,p256dh,auth").eq("consumer_id", c.id);
        subs = data ?? [];
      }
    }
    const payload = JSON.stringify({ title, body, url: url || "/app/home" });
    let sent = 0, failed = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++;
      } catch (e: any) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }
    return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
