import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { estimateImpact } from "@/lib/impactMethodology";

/** Embeddable public counter: /widget/meals?city=Tulsa&state=OK. Refreshes every minute. */
export default function CityCounterWidget() {
  const [params] = useSearchParams();
  const city = (params.get("city") || "").slice(0, 100);
  const state = (params.get("state") || "").slice(0, 50);
  const [pounds, setPounds] = useState<number | null>(null);

  useEffect(() => {
    document.title = city ? `Meals rescued in ${city}` : "Meals rescued";
    if (!city) return;
    const load = async () => {
      const { data } = await supabase.rpc("public_city_impact" as any, { p_city: city, p_state: state || null });
      const row = Array.isArray(data) ? data[0] : data;
      setPounds(Number(row?.pounds ?? 0));
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [city, state]);

  const meals = pounds == null ? null : estimateImpact(pounds).meals;
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3">
      <a href="https://hariet.ai/impact" target="_blank" rel="noopener noreferrer" className="w-full max-w-xs rounded-xl border bg-card p-5 text-center block">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Meals rescued in {city || "your city"}</p>
        <p className="text-4xl font-bold text-foreground my-1 tabular-nums">{meals == null ? "—" : meals.toLocaleString()}</p>
        <p className="text-[11px] text-muted-foreground">
          {pounds != null && `${Math.round(pounds).toLocaleString()} lbs diverted · `}Estimate: 1 lb = 0.8 meals
        </p>
        <p className="text-[11px] font-semibold text-primary mt-2">Powered by Hariet.AI</p>
      </a>
    </div>
  );
}
