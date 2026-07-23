// One-time (and idempotent) backfill: geocode published events that have an
// address but null latitude/longitude. Admin-only. Safe to re-run.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { "User-Agent": "GoSeeTheCity-Backfill/1.0 (hello@goseethecity.com)" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: u } = await authClient.auth.getUser();
  const sb = createClient(supabaseUrl, serviceKey);

  // Accept either an admin JWT OR the internal push secret (for cron/backfill scripts).
  const internalSecret = req.headers.get("X-Internal-Secret");
  const validInternal = internalSecret && internalSecret === Deno.env.get("PUSH_INTERNAL_SECRET");
  let isAdmin = false;
  if (u?.user) {
    const { data: role } = await sb
      .from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    isAdmin = !!role;
  }
  if (!isAdmin && !validInternal) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: events, error } = await sb
    .from("events")
    .select("id, address, city, state, zip, latitude, longitude, status")
    .eq("status", "published")
    .or("latitude.is.null,longitude.is.null")
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0, skipped = 0, failed = 0;
  const details: Array<{ id: string; result: string }> = [];

  for (const evt of events ?? []) {
    const parts = [evt.address, evt.city, evt.state, (evt as any).zip].filter(Boolean);
    if (!parts.length) { skipped++; details.push({ id: evt.id, result: "no address" }); continue; }
    const coords = await geocode(parts.join(", "));
    if (!coords) { failed++; details.push({ id: evt.id, result: "geocode failed" }); continue; }
    const { error: upErr } = await sb
      .from("events").update({ latitude: coords.lat, longitude: coords.lng }).eq("id", evt.id);
    if (upErr) { failed++; details.push({ id: evt.id, result: upErr.message }); }
    else { updated++; details.push({ id: evt.id, result: "ok" }); }
    // Be polite to Nominatim.
    await new Promise((r) => setTimeout(r, 1100));
  }

  return new Response(JSON.stringify({
    scanned: events?.length ?? 0, updated, skipped, failed, details,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
