// Worldwide city autocomplete for the consumer app's city picker.
// Uses Google Places API (New) Autocomplete with the project's GOOGLE_PLACES_API_KEY.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Signed-in users only (keeps this billable lookup off the open internet).
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims, error: authErr } = await supa.auth.getClaims(auth.slice(7));
  if (authErr || !claims?.claims?.sub) return json({ error: "Sign in required" }, 401);

  let body: { input?: unknown; sessionToken?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const input = typeof body.input === "string" ? body.input.trim() : "";
  const sessionToken = typeof body.sessionToken === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionToken) ? body.sessionToken : undefined;
  if (input.length < 2 || input.length > 100) return json({ error: "Input must be 2-100 characters" }, 400);

  const key = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!key) {
    return json({ error: "not_configured", message: "GOOGLE_PLACES_API_KEY is not set in the project's secrets." }, 503);
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({ input, includedPrimaryTypes: ["(cities)"], sessionToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`places autocomplete [${res.status}]: ${text}`);
    const disabled = res.status === 403 && /SERVICE_DISABLED|has not been used|API_KEY_SERVICE_BLOCKED|not authorized/i.test(text);
    return json({
      error: disabled ? "api_not_enabled" : "provider_error",
      message: disabled
        ? "The Google key does not have Places API (New) enabled. Enable it in Google Cloud Console."
        : "City lookup failed.",
      status: res.status,
      details: text.slice(0, 500),
    }, disabled ? 503 : 502);
  }

  const data = await res.json();
  const results = (data?.suggestions ?? [])
    .map((s: any) => s?.placePrediction)
    .filter(Boolean)
    .map((p: any) => {
      const main = p.structuredFormat?.mainText?.text ?? p.text?.text?.split(",")[0] ?? "";
      const secondary = p.structuredFormat?.secondaryText?.text ?? "";
      const parts = secondary.split(",").map((x: string) => x.trim()).filter(Boolean);
      const country = parts[parts.length - 1] ?? "";
      const isUS = /^(USA|United States)$/i.test(country);
      // US: "FL"-style state as region. Elsewhere: country name.
      const region = isUS ? (parts[0] ?? "") : country;
      return { placeId: p.placeId, city: main, region, secondary, label: p.text?.text ?? `${main}, ${secondary}` };
    })
    .filter((r: any) => r.city && r.region);

  return json({ results });
});
