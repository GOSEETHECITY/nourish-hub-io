// Send Web Push notifications via VAPID.
// Body: { consumer_ids?: string[], city?: string, title, body, url? }
// Admins/service role only.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:Hello@hariet.ai",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await anon.auth.getClaims(token);
    if (!claims?.claims?.sub) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // require admin role
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { consumer_ids, city, title, body, url } = await req.json();
    if (!title || !body) return new Response(JSON.stringify({ error: "title and body required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, consumer_id, consumers!inner(city)");
    if (consumer_ids?.length) query = query.in("consumer_id", consumer_ids);
    else if (city) query = query.eq("consumers.city", city);
    const { data: subs, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({ title, body, url: url || "/app/home" });
    let sent = 0, failed = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        failed++;
        if (e.statusCode === 404 || e.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }
    return new Response(JSON.stringify({ sent, failed, total: subs?.length ?? 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
