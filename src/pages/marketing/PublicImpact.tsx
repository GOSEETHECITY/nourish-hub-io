import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";

type Snapshot = {
  platform_totals: {
    pounds_rescued?: number;
    meals_provided?: number;
    donation_value_usd?: number;
    people_fed?: number;
    co2_lbs_avoided?: number;
    total_donations?: number;
  };
  city_breakdown: Array<{ city: string; state: string; pounds: number; donations: number }>;
  testimonials: Array<{ quote: string; photo_url: string | null; submitted_at: string }>;
  refreshed_at: string;
};

const fmt = (n?: number) => (n ?? 0).toLocaleString();

export default function PublicImpact() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Our Impact | Hariet.AI";
    const desc = "Real-time totals of food rescued, meals provided, and CO2 avoided across Hariet.AI's operator network.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    meta.setAttribute("content", desc);

    supabase.from("impact_stats").select("*").eq("id", 1).maybeSingle()
      .then(({ data }) => { setData(data as Snapshot | null); setLoading(false); });
  }, []);

  const t = data?.platform_totals ?? {};

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">
        <header className="mb-10">
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight">Our Impact</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Every stat here is drawn live from donations that operators posted and nonprofits picked up on Hariet.AI.
            {data?.refreshed_at && (
              <> Last refreshed {new Date(data.refreshed_at).toLocaleString()}.</>
            )}
          </p>
        </header>

        <section aria-label="Platform totals" className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-14">
          {[
            ["Pounds rescued", fmt(t.pounds_rescued)],
            ["Meals provided", fmt(t.meals_provided)],
            ["People fed", fmt(t.people_fed)],
            ["Fair market value", `$${fmt(t.donation_value_usd)}`],
            ["CO2 avoided (lbs)", fmt(t.co2_lbs_avoided)],
            ["Total donations", fmt(t.total_donations)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card p-6">
              <div className="text-3xl font-semibold">{value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>

        <section aria-label="City breakdown" className="mb-14">
          <h2 className="font-serif text-3xl mb-4">Top cities</h2>
          {loading ? <div className="text-muted-foreground">Loading…</div> : (
            <ul className="divide-y rounded-xl border bg-card">
              {(data?.city_breakdown ?? []).slice(0, 12).map((c, i) => (
                <li key={`${c.city}-${c.state}-${i}`} className="flex justify-between px-6 py-3">
                  <span className="font-medium">{c.city}{c.state ? `, ${c.state}` : ""}</span>
                  <span className="text-muted-foreground">{fmt(c.pounds)} lbs · {fmt(c.donations)} donations</span>
                </li>
              ))}
              {(!data?.city_breakdown || data.city_breakdown.length === 0) && (
                <li className="px-6 py-6 text-muted-foreground">No city-level activity yet.</li>
              )}
            </ul>
          )}
        </section>

        <section aria-label="Testimonials">
          <h2 className="font-serif text-3xl mb-4">From the field</h2>
          {data?.testimonials?.length ? (
            <div className="grid md:grid-cols-2 gap-4">
              {data.testimonials.map((tst, i) => (
                <figure key={i} className="rounded-xl border bg-card p-6">
                  <blockquote className="text-lg leading-relaxed">"{tst.quote}"</blockquote>
                  {tst.photo_url && (
                    <img src={tst.photo_url} alt="" loading="lazy" className="mt-4 max-h-56 rounded-lg object-cover" />
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nonprofits who opt in to share their stories will appear here.</p>
          )}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
