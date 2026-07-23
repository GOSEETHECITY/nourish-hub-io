import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, string>;
type Result = {
  row: number;
  event_name: string;
  status: "created" | "failed";
  id?: string;
  reason?: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const isDateYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isHm = (s: string) => /^\d{1,2}:\d{2}$/.test(s);

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { "User-Agent": "GoSeeTheCity-Import/1.0 (hello@goseethecity.com)" } }
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await sb
    .from("user_roles").select("id").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { csv_text?: string; rows?: Row[] };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows: Row[] = body.rows && Array.isArray(body.rows)
    ? body.rows
    : body.csv_text ? parseCsv(body.csv_text) : [];

  if (!rows.length) {
    return new Response(JSON.stringify({ error: "No rows to import" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const batchId = crypto.randomUUID().slice(0, 8);
  const results: Result[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // header + 1-index
    const name = (r.event_name || "").trim();
    const fail = (reason: string) =>
      results.push({ row: rowNum, event_name: name || "(empty)", status: "failed", reason });

    if (!name) { fail("Missing event_name"); continue; }

    const eventDate = (r.event_date || "").trim();
    if (!isDateYmd(eventDate)) { fail("event_date must be YYYY-MM-DD"); continue; }
    const evDateObj = new Date(eventDate + "T00:00:00");
    if (isNaN(evDateObj.getTime())) { fail("Invalid event_date"); continue; }
    if (evDateObj < today) { fail("event_date must be in the future"); continue; }

    const start = (r.start_time || "").trim();
    const end = (r.end_time || "").trim();
    if (!isHm(start)) { fail("start_time must be HH:MM"); continue; }
    if (!isHm(end)) { fail("end_time must be HH:MM"); continue; }
    if (start >= end) { fail("start_time must be before end_time"); continue; }

    const orgId = (r.organization_id || "").trim();
    let businessName: string | null = null;
    if (orgId) {
      if (!isUuid(orgId)) { fail("organization_id is not a valid UUID"); continue; }
      const { data: org } = await sb
        .from("organizations").select("id, organization_name").eq("id", orgId).maybeSingle();
      if (!org) { fail("organization_id not found"); continue; }
      businessName = (org as any).organization_name ?? null;
    }

    const latRaw = (r.latitude || "").trim();
    const lngRaw = (r.longitude || "").trim();
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (latRaw || lngRaw) {
      const lat = parseFloat(latRaw);
      const lng = parseFloat(lngRaw);
      if (!isFinite(lat) || lat < -90 || lat > 90) { fail("latitude out of range"); continue; }
      if (!isFinite(lng) || lng < -180 || lng > 180) { fail("longitude out of range"); continue; }
      latitude = lat; longitude = lng;
    }

    // ITEM 3: server-side fallback geocode when coords are missing but address exists.
    const addrParts = [(r.address || "").trim(), (r.city || "").trim(), (r.state || "").trim(), (r.zip || "").trim()].filter(Boolean);
    if ((latitude === null || longitude === null) && addrParts.length) {
      const coords = await geocodeAddress(addrParts.join(", "));
      if (coords) { latitude = coords.lat; longitude = coords.lng; }
    }


    const foodItems = (r.food_items || "").trim();
    const estValue = (r.estimated_value || "").trim();
    const baseDesc = (r.description || "").trim();
    const descParts = [baseDesc];
    if (foodItems) descParts.push(`Featured: ${foodItems}.`);
    if (estValue && !isNaN(parseFloat(estValue))) descParts.push(`Estimated value: $${parseFloat(estValue).toFixed(2)}.`);
    const description = descParts.filter(Boolean).join(" ");

    const image = (r.event_image_url || "").trim() || null;

    const insertPayload: Record<string, unknown> = {
      title: name,
      description: description || null,
      event_date: eventDate,
      start_time: start,
      end_time: end,
      address: (r.address || "").trim() || null,
      city: (r.city || "").trim() || null,
      state: (r.state || "").trim() || null,
      latitude,
      longitude,
      image_url: image,
      flyer_url: image,
      status: "published",
      county: "",
      business_name: businessName,
      created_from_import: true,
      source_type: "grand_opening_csv",
      import_batch_id: batchId,
    };

    const { data: evt, error: insErr } = await sb
      .from("events").insert(insertPayload).select("id").single();

    if (insErr || !evt) { fail(insErr?.message || "Insert failed"); continue; }

    await sb.from("events").update({ share_url: `/event-preview/${evt.id}` }).eq("id", evt.id);

    results.push({ row: rowNum, event_name: name, status: "created", id: evt.id });
  }

  const summary = {
    batch_id: batchId,
    total: rows.length,
    created: results.filter((r) => r.status === "created").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
