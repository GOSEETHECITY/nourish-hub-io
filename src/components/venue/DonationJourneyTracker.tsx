import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

const STAGES = ["Donation posted", "Donation claimed", "Nonprofit on the way", "Nonprofit on site", "Pickup confirmed"];

function stageOf(l: any) {
  if (l.status === "picked_up" || l.picked_up_at) return 4;
  if (l.on_site_at) return 3;
  if (l.en_route_at) return 2;
  if (l.nonprofit_claimed_id) return 1;
  return 0;
}

/** Live status timeline for each active donation; refreshes via realtime on food_listings changes. */
export default function DonationJourneyTracker({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data: listings = [] } = useQuery({
    queryKey: ["venue-journey", orgId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data } = await supabase.from("food_listings")
        .select("id, food_type, pounds, status, created_at, nonprofit_claimed_id, claimed_at, en_route_at, on_site_at, picked_up_at, pickup_window_end")
        .eq("organization_id", orgId).eq("listing_type", "donation")
        .or(`status.in.(posted,claimed),and(status.eq.picked_up,picked_up_at.gte.${since})`)
        .order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`venue-journey-${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "food_listings", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["venue-journey", orgId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, qc]);

  const npIds = useMemo(() => [...new Set(listings.map((l: any) => l.nonprofit_claimed_id).filter(Boolean))], [listings]);
  const { data: nps = [] } = useQuery({
    queryKey: ["venue-journey-nps", npIds],
    queryFn: async () => (await supabase.from("nonprofits").select("id, organization_name").in("id", npIds as string[])).data || [],
    enabled: npIds.length > 0,
  });
  const npName = Object.fromEntries((nps as any[]).map((n) => [n.id, n.organization_name]));

  if (!listings.length) return null;
  return (
    <section className="bg-card rounded-xl border p-5 space-y-5">
      <h2 className="font-semibold text-foreground">Live donation tracker</h2>
      {listings.map((l: any) => {
        const s = stageOf(l);
        const times = [l.created_at, l.claimed_at, l.en_route_at, l.on_site_at, l.picked_up_at];
        return (
          <div key={l.id} className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground capitalize">{l.food_type?.replace(/_/g, " ") || "Donation"}</span>
              {l.pounds ? ` · ${l.pounds} lb` : ""}{l.nonprofit_claimed_id ? ` · ${npName[l.nonprofit_claimed_id] || "Nonprofit"}` : ""}
            </p>
            <ol className="grid grid-cols-5 gap-1">
              {STAGES.map((label, i) => (
                <li key={label} className="flex flex-col items-center text-center gap-1">
                  <div className="flex items-center w-full">
                    <div className={`h-0.5 flex-1 ${i === 0 ? "invisible" : i <= s ? "bg-primary" : "bg-border"}`} />
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${i === s && s < 4 ? "ring-2 ring-primary/30" : ""}`}>
                      {i < s || s === 4 ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </span>
                    <div className={`h-0.5 flex-1 ${i === 4 ? "invisible" : i < s ? "bg-primary" : "bg-border"}`} />
                  </div>
                  <span className={`text-[11px] leading-tight ${i <= s ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                  {times[i] && i <= s && <span className="text-[10px] text-muted-foreground">{new Date(times[i]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </section>
  );
}
