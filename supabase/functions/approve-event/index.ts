import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.event_ids) ? body.event_ids.slice(0, 500) : [];
    if (!ids.length) {
      return new Response(JSON.stringify({ error: "event_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events, error: fetchErr } = await supabase
      .from("events").select("id, address, city, state, latitude, longitude").in("id", ids);
    if (fetchErr) throw fetchErr;

    const geocode = async (q: string): Promise<{ lat: number; lng: number } | null> => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
        const r = await fetch(url, { headers: { "User-Agent": "HarietAI-Admin/1.0" } });
        if (!r.ok) return null;
        const j = await r.json();
        if (!j?.length) return null;
        return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
      } catch { return null; }
    };

    let approved = 0;
    for (const ev of events || []) {
      let lat = ev.latitude, lng = ev.longitude;
      if (lat == null || lng == null) {
        const addr = [ev.address, ev.city, ev.state].filter(Boolean).join(", ");
        if (addr) {
          const c = await geocode(addr);
          if (c) { lat = c.lat; lng = c.lng; }
          await new Promise((r) => setTimeout(r, 1100)); // Nominatim rate limit
        }
      }
      const { error: updErr } = await supabase.from("events")
        .update({ status: "published", latitude: lat, longitude: lng })
        .eq("id", ev.id);
      if (!updErr) approved++;
    }

    return new Response(JSON.stringify({ approved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
