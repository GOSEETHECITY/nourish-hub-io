// Refreshes the single-row public.impact_stats snapshot used by /impact.
// Runs on cron (daily) and can also be invoked ad-hoc by an admin.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ---- platform totals ---------------------------------------------------
    const { data: totalsRow } = await admin
      .from("food_listings")
      .select("pounds, estimated_donation_value, status", { count: "exact", head: false })
      .in("status", ["picked_up", "pending_impact_report", "completed"]);

    const pounds = (totalsRow ?? []).reduce((s, r: any) => s + Number(r.pounds ?? 0), 0);
    const value = (totalsRow ?? []).reduce((s, r: any) => s + Number(r.estimated_donation_value ?? 0), 0);
    const donations = (totalsRow ?? []).length;

    const { data: surveys } = await admin
      .from("impact_surveys")
      .select("people_fed, testimonial, testimonial_public, photo_urls, submitted_at, nonprofit_id, venue_organization_id")
      .not("submitted_at", "is", null);

    const peopleFed = (surveys ?? []).reduce((s, r: any) => s + Number(r.people_fed ?? 0), 0);

    // meals = pounds * 0.8 (USDA-ish approximation), CO2 = pounds * 2.5 lb CO2e
    const meals = Math.round(pounds * 0.8);
    const co2LbsAvoided = Math.round(pounds * 2.5);

    const platform_totals = {
      pounds_rescued: Math.round(pounds),
      meals_provided: meals,
      donation_value_usd: Math.round(value),
      people_fed: peopleFed,
      co2_lbs_avoided: co2LbsAvoided,
      total_donations: donations,
    };

    // ---- city breakdown ----------------------------------------------------
    const { data: cityRows } = await admin
      .from("food_listings")
      .select("pounds, locations!inner(city, state)")
      .in("status", ["picked_up", "pending_impact_report", "completed"]);

    const cityMap = new Map<string, { city: string; state: string; pounds: number; donations: number }>();
    for (const r of (cityRows ?? []) as any[]) {
      const city = r.locations?.city;
      const state = r.locations?.state;
      if (!city) continue;
      const key = `${city}|${state ?? ""}`;
      const cur = cityMap.get(key) ?? { city, state, pounds: 0, donations: 0 };
      cur.pounds += Number(r.pounds ?? 0);
      cur.donations += 1;
      cityMap.set(key, cur);
    }
    const city_breakdown = [...cityMap.values()]
      .sort((a, b) => b.pounds - a.pounds)
      .slice(0, 25)
      .map(c => ({ ...c, pounds: Math.round(c.pounds) }));

    // ---- testimonials (opt-in only) ---------------------------------------
    const testimonials = (surveys ?? [])
      .filter((s: any) => s.testimonial_public && s.testimonial)
      .slice(0, 12)
      .map((s: any) => ({
        quote: String(s.testimonial).slice(0, 400),
        photo_url: Array.isArray(s.photo_urls) && s.photo_urls[0] ? s.photo_urls[0] : null,
        submitted_at: s.submitted_at,
      }));

    await admin
      .from("impact_stats")
      .upsert({
        id: 1,
        platform_totals,
        city_breakdown,
        testimonials,
        refreshed_at: new Date().toISOString(),
      });

    return new Response(JSON.stringify({ ok: true, platform_totals }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refresh-impact-snapshot failed", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
