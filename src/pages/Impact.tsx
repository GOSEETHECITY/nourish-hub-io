import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, Trophy, Droplets, TreeDeciduous, Car, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FoodListing, ImpactReport, Organization, Nonprofit } from "@/types/database";

export default function Impact() {
  const [filterCity, setFilterCity] = useState("all");
  const [filterState, setFilterState] = useState("all");
  const [filterOrg, setFilterOrg] = useState("all");

  const { data: listings = [] } = useQuery({
    queryKey: ["impact-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("listing_type", "donation").in("status", ["completed", "claimed", "picked_up", "pending_impact_report"]);
      if (error) throw error;
      return data as FoodListing[];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["impact-reports"],
    queryFn: async () => { const { data } = await supabase.from("impact_reports").select("*"); return (data || []) as ImpactReport[]; },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => { const { data } = await supabase.from("organizations").select("*"); return (data || []) as Organization[]; },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["nonprofits"],
    queryFn: async () => { const { data } = await supabase.from("nonprofits").select("*"); return (data || []) as Nonprofit[]; },
  });

  const { data: locs = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => { const { data } = await supabase.from("locations").select("id, organization_id, city, state"); return (data || []) as any[]; },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const locMap = useMemo(() => Object.fromEntries(locs.map((l: any) => [l.id, l])), [locs]);

  const cities = useMemo(() => [...new Set(locs.map((l: any) => l.city).filter(Boolean))].sort(), [locs]);
  const states = useMemo(() => [...new Set(locs.map((l: any) => l.state).filter(Boolean))].sort(), [locs]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      const loc = locMap[l.location_id];
      if (filterCity !== "all" && loc?.city !== filterCity) return false;
      if (filterState !== "all" && loc?.state !== filterState) return false;
      if (filterOrg !== "all" && l.organization_id !== filterOrg) return false;
      return true;
    });
  }, [listings, filterCity, filterState, filterOrg, locMap]);

  const totalPounds = filteredListings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const totalValue = filteredListings.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const co2 = totalPounds * 3.8;
  const water = totalPounds * 108;
  const landfill = totalPounds;
  const trees = co2 / 48;
  const carMiles = co2 / 0.000404;

  // Rankings
  const orgRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredListings.forEach((l) => { map[l.organization_id] = (map[l.organization_id] || 0) + (l.pounds || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([id, pounds]) => ({ org: orgMap[id], pounds })).filter((r) => r.org);
  }, [filteredListings, orgMap]);

  const npRanking = useMemo(() => {
    const claimMap: Record<string, { pounds: number; meals: number }> = {};
    filteredListings.forEach((l) => {
      if (l.nonprofit_claimed_id) {
        if (!claimMap[l.nonprofit_claimed_id]) claimMap[l.nonprofit_claimed_id] = { pounds: 0, meals: 0 };
        claimMap[l.nonprofit_claimed_id].pounds += l.pounds || 0;
      }
    });
    reports.forEach((r) => {
      if (claimMap[r.nonprofit_id]) claimMap[r.nonprofit_id].meals += r.meals_served || 0;
    });
    return Object.entries(claimMap).sort((a, b) => b[1].pounds - a[1].pounds).map(([id, data]) => {
      const np = nonprofits.find((n) => n.id === id);
      return { np, ...data };
    }).filter((r) => r.np);
  }, [filteredListings, reports, nonprofits]);

  const metrics = [
    { label: "Total Pounds Diverted", value: `${totalPounds.toLocaleString()} lbs`, icon: Leaf },
    { label: "Total Meals Served", value: totalMeals.toLocaleString(), icon: Trophy },
    { label: "Est. Donation Value", value: `$${totalValue.toLocaleString()}`, icon: Trophy },
    { label: "CO₂ Prevented", value: `${co2.toLocaleString()} lbs`, icon: Leaf },
    { label: "Water Saved", value: `${water.toLocaleString()} gal`, icon: Droplets },
    { label: "Landfill Diverted", value: `${landfill.toLocaleString()} lbs`, icon: Trash2 },
    { label: "Equiv. Trees Planted", value: Math.round(trees).toLocaleString(), icon: TreeDeciduous },
    { label: "Equiv. Car Miles Removed", value: Math.round(carMiles).toLocaleString(), icon: Car },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impact</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide impact metrics and environmental data</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><m.icon className="w-4 h-4" />{m.label}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterCity} onValueChange={setFilterCity}><SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger><SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Select value={filterState} onValueChange={setFilterState}><SelectTrigger className="w-[120px]"><SelectValue placeholder="State" /></SelectTrigger><SelectContent><SelectItem value="all">All States</SelectItem>{states.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Organization" /></SelectTrigger><SelectContent><SelectItem value="all">All Organizations</SelectItem>{orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">🏆 Top Organizations by Food Diverted</h2>
          {orgRanking.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
            <div className="space-y-3">
              {orgRanking.slice(0, 10).map((r, i) => (
                <div key={r.org!.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                  <div className="flex-1"><p className="text-sm font-medium text-foreground">{r.org!.name}</p></div>
                  <p className="text-sm font-bold text-foreground">{r.pounds.toLocaleString()} lbs</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">🏆 Top Nonprofits by Food Claimed</h2>
          {npRanking.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
            <div className="space-y-3">
              {npRanking.slice(0, 10).map((r, i) => (
                <div key={r.np!.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{r.np!.organization_name}</p>
                    <p className="text-xs text-muted-foreground">{r.meals.toLocaleString()} meals served</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{r.pounds.toLocaleString()} lbs</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
