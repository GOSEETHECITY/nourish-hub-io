// Grand Opening Events AI Agent
// Runs daily (via pg_cron) to source new grand opening events from external
// sources, dedupe, insert as `pending`, generate AI flyers when no photo
// exists, and post an admin summary notification.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

type Category =
  | "restaurant" | "retail" | "fitness" | "entertainment"
  | "beauty" | "medical" | "other";

interface SourcedEvent {
  business_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  event_date: string;       // YYYY-MM-DD
  event_time: string | null; // HH:MM
  category: Category;
  description: string;
  photo_url: string | null;
  source_url: string;
  source: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EVENTBRITE_API_KEY = Deno.env.get("EVENTBRITE_API_KEY");
const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Category inference ---
const KEYWORDS: Record<Category, string[]> = {
  restaurant: ["restaurant", "cafe", "bistro", "eatery", "kitchen", "bakery", "coffee", "grill", "pizzeria", "diner", "bar"],
  fitness: ["gym", "fitness", "yoga", "pilates", "crossfit", "studio", "wellness"],
  beauty: ["salon", "spa", "barber", "nail", "beauty", "aesthetic"],
  retail: ["store", "shop", "boutique", "market", "outlet", "retail"],
  entertainment: ["theater", "cinema", "arcade", "venue", "lounge", "club"],
  medical: ["clinic", "dental", "medical", "pharmacy", "urgent care", "chiropractic"],
  other: [],
};
function inferCategory(name: string, description: string): Category {
  const hay = `${name} ${description}`.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => hay.includes(w))) return cat as Category;
  }
  return "other";
}

// --- Address parsing ---
function parseUsAddress(address: string): { street: string; city: string; state: string; zip: string | null } {
  // "123 Main St, Orlando, FL 32801, USA"
  const clean = address.replace(/, USA$/i, "").trim();
  const parts = clean.split(",").map((p) => p.trim());
  const last = parts[parts.length - 1] || "";
  const m = last.match(/^([A-Z]{2})\s*(\d{5})?$/);
  let state = "", zip: string | null = null, city = "", street = "";
  if (m) {
    state = m[1];
    zip = m[2] ?? null;
    city = parts[parts.length - 2] ?? "";
    street = parts.slice(0, parts.length - 2).join(", ");
  } else {
    city = parts[parts.length - 2] ?? "";
    street = parts.slice(0, parts.length - 2).join(", ");
  }
  return { street, city, state, zip };
}

// --- Source: Eventbrite ---
async function fetchEventbrite(): Promise<SourcedEvent[]> {
  if (!EVENTBRITE_API_KEY) return [];
  const url = new URL("https://www.eventbriteapi.com/v3/events/search/");
  url.searchParams.set("q", "grand opening");
  url.searchParams.set("expand", "venue");
  url.searchParams.set("start_date.range_start", new Date().toISOString().slice(0, 19));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${EVENTBRITE_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Eventbrite ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const events = (data.events ?? []) as any[];
  return events.map((e) => {
    const start = new Date(e.start?.utc ?? e.start?.local);
    const venue = e.venue ?? {};
    const name = e.name?.text ?? "Grand Opening";
    const description = e.description?.text ?? "";
    return {
      business_name: name.replace(/grand opening[:\-]?\s*/i, "").trim() || name,
      address: venue.address?.localized_address_display ?? "",
      city: venue.address?.city ?? "",
      state: venue.address?.region ?? "",
      zip_code: venue.address?.postal_code ?? null,
      event_date: isFinite(start.getTime()) ? start.toISOString().slice(0, 10) : "",
      event_time: isFinite(start.getTime()) ? start.toISOString().slice(11, 16) : null,
      category: inferCategory(name, description),
      description,
      photo_url: e.logo?.url ?? null,
      source_url: e.url,
      source: "eventbrite",
    } as SourcedEvent;
  }).filter((e) => e.event_date && e.city && e.state);
}

// --- Source: Google Places (Text Search) ---
async function fetchGooglePlaces(): Promise<SourcedEvent[]> {
  if (!GOOGLE_PLACES_API_KEY) return [];
  const url = "https://places.googleapis.com/v1/places:searchText";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.addressComponents,places.types,places.photos,places.websiteUri,places.id",
    },
    body: JSON.stringify({ textQuery: "newly opened business grand opening" }),
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const places = (data.places ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);
  return places.map((p) => {
    const name = p.displayName?.text ?? "Grand Opening";
    const parsed = parseUsAddress(p.formattedAddress ?? "");
    return {
      business_name: name,
      address: parsed.street || p.formattedAddress || "",
      city: parsed.city,
      state: parsed.state,
      zip_code: parsed.zip,
      event_date: today,
      event_time: null,
      category: inferCategory(name, (p.types ?? []).join(" ")),
      description: `Newly opened: ${name}.`,
      photo_url: null, // Photo lookups require an additional media request.
      source_url: p.websiteUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
      source: "google_places",
    } as SourcedEvent;
  }).filter((e) => e.city && e.state);
}

// --- Source: Web search via Lovable AI Gateway (Gemini with Google Search grounding) ---
// Uses LOVABLE_API_KEY. Queries the model for grand opening announcements in target cities
// and parses a strict JSON schema back. Falls back to empty array on any failure.
const TARGET_CITIES: Array<{ city: string; state: string }> = [
  { city: "Orlando", state: "FL" },
  { city: "Tampa", state: "FL" },
  { city: "Miami", state: "FL" },
  { city: "Austin", state: "TX" },
];

async function fetchWebSearch(): Promise<SourcedEvent[]> {
  if (!LOVABLE_API_KEY) return [];
  const out: SourcedEvent[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const { city, state } of TARGET_CITIES) {
    try {
      const prompt =
        `Search the web for upcoming grand opening events in ${city}, ${state} within the next 60 days. ` +
        `Queries to consider: "${city} grand opening events", "${city} new business opening", "grand opening near ${city}". ` +
        `Return ONLY a JSON array (no prose, no markdown fences) where each item has: ` +
        `business_name, address, city, state, zip_code (nullable), event_date (YYYY-MM-DD), event_time (HH:MM or null), ` +
        `category (one of: restaurant, retail, fitness, entertainment, beauty, medical, other), description, source_url. ` +
        `Only include real, verifiable openings with a specific date. If nothing found, return [].`;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) { console.error("web_search", res.status, await res.text()); continue; }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;
      const arr = JSON.parse(jsonMatch[0]);
      for (const it of arr) {
        if (!it?.business_name || !it?.event_date || !it?.city) continue;
        out.push({
          business_name: String(it.business_name).slice(0, 200),
          address: String(it.address ?? ""),
          city: String(it.city),
          state: String(it.state ?? state),
          zip_code: it.zip_code ?? null,
          event_date: String(it.event_date),
          event_time: it.event_time ?? null,
          category: (["restaurant","retail","fitness","entertainment","beauty","medical","other"].includes(it.category) ? it.category : inferCategory(it.business_name, it.description ?? "")) as Category,
          description: String(it.description ?? `Grand opening in ${it.city}.`),
          photo_url: null,
          source_url: String(it.source_url ?? "https://hariet.ai"),
          source: "web_search",
        });
      }
    } catch (e) {
      console.error("web_search error", city, e);
    }
  }
  return out;
}

// --- AI flyer generation ---
async function generateFlyer(ev: SourcedEvent): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const prompt =
      `Vibrant event flyer for a grand opening. Business name "${ev.business_name}" as the main title. ` +
      `Event date "${ev.event_date}". City "${ev.city}, ${ev.state}". ` +
      `Brand palette: bright orange #F97316 and deep navy #1B2A4A on white. ` +
      `Clean modern typography, celebratory ribbon or confetti accents, ` +
      `"GO See The City" small logo mark bottom right. No stock photos, poster style, high contrast.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-image-1-mini",
        prompt,
        size: "1024x1024",
        quality: "low",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return null;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `flyers/${crypto.randomUUID()}.png`;
    const { error: upErr } = await admin.storage
      .from("events")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upErr) return null;
    const { data: pub } = admin.storage.from("events").getPublicUrl(path);
    return pub.publicUrl;
  } catch {
    return null;
  }
}

// --- Dedup + insert ---
async function isDuplicate(ev: SourcedEvent): Promise<boolean> {
  const { data } = await admin
    .from("events")
    .select("id")
    .ilike("business_name", ev.business_name)
    .ilike("city", ev.city)
    .eq("event_date", ev.event_date)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function insertEvent(ev: SourcedEvent, flyerUrl: string | null): Promise<boolean> {
  const { error } = await admin.from("events").insert({
    title: `${ev.business_name} — Grand Opening`,
    business_name: ev.business_name,
    description: ev.description,
    address: ev.address,
    city: ev.city,
    state: ev.state,
    event_date: ev.event_date,
    start_time: ev.event_time,
    category: ev.category,
    image_url: ev.photo_url,
    flyer_url: flyerUrl,
    external_link: ev.source_url,
    source_type: ev.source,
    status: "pending",
    created_from_import: true,
  });
  if (error) console.error("insert event error", error);
  return !error;
}

// --- Main run ---
async function run() {
  const started_at = new Date().toISOString();
  const errors: string[] = [];
  const sources: SourcedEvent[] = [];
  const breakdown = {
    by_source: {} as Record<string, number>,
    by_city: {} as Record<string, number>,
    by_category: {} as Record<string, number>,
    with_photo: 0,
    ai_flyers_generated: 0,
  };

  for (const [name, fn] of Object.entries({
    eventbrite: fetchEventbrite,
    google_places: fetchGooglePlaces,
    web_search: fetchWebSearch,
  })) {
    try {
      const items = await fn();
      breakdown.by_source[name] = items.length;
      sources.push(...items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${name}: ${msg}`);
      console.error(name, msg);
    }
  }

  let inserted = 0, dups = 0;
  for (const ev of sources) {
    try {
      if (await isDuplicate(ev)) { dups++; continue; }
      let flyer: string | null = null;
      if (ev.photo_url) {
        breakdown.with_photo++;
      } else {
        flyer = await generateFlyer(ev);
        if (flyer) breakdown.ai_flyers_generated++;
      }
      const ok = await insertEvent(ev, flyer);
      if (ok) {
        inserted++;
        breakdown.by_city[ev.city] = (breakdown.by_city[ev.city] ?? 0) + 1;
        breakdown.by_category[ev.category] = (breakdown.by_category[ev.category] ?? 0) + 1;
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  await admin.from("agent_runs").insert({
    agent_name: "grand_opening_events",
    started_at,
    finished_at: new Date().toISOString(),
    events_found: sources.length,
    events_inserted: inserted,
    duplicates_skipped: dups,
    errors: errors.length,
    breakdown,
    error_log: errors.join("\n") || null,
  });

  await admin.from("admin_notifications").insert({
    type: "system",
    title: "Grand Opening Agent Daily Summary",
    description:
      `Found ${sources.length} events (${Object.entries(breakdown.by_source).map(([k, v]) => `${k}: ${v}`).join(", ")}). ` +
      `${inserted} new, ${dups} duplicates. ${breakdown.with_photo} with photos, ${breakdown.ai_flyers_generated} AI flyers generated. ` +
      `By city: ${Object.entries(breakdown.by_city).map(([k, v]) => `${k} (${v})`).join(", ") || "none"}. ` +
      `By category: ${Object.entries(breakdown.by_category).map(([k, v]) => `${k} (${v})`).join(", ") || "none"}.`,
    link: "/admin/events?tab=pending",
  });

  return { sources: sources.length, inserted, dups, errors: errors.length, breakdown };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const result = await run();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
