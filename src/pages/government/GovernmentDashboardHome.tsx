import { useState, useMemo } from "react";
import { ORG_PUBLIC_COLUMNS, withOrgPrivateOne } from "@/lib/privateFields";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Leaf, Trophy, Building2, Heart, Droplets, TreeDeciduous, Trash2, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterByRegion, type GovernmentRegions } from "@/lib/regionFilter";
import { estimateImpact, IMPACT_FACTORS } from "@/lib/impactMethodology";
import ImpactMethodologyNote from "@/components/impact/ImpactMethodologyNote";
import { downloadGovImpactPdf, monthlyTrend } from "@/lib/govImpactPdf";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileDown, Target } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import CityCounterEmbed from "@/components/government/CityCounterEmbed";
import type { FoodListing, ImpactReport, Organization, Nonprofit } from "@/types/database";

export default function GovernmentDashboardHome() {
  const { profile } = useAuth();
  const [filterCity, setFilterCity] = useState("all");

  const { data: myOrg } = useQuery({
    queryKey: ["my-gov-org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select(ORG_PUBLIC_COLUMNS).eq("id", profile!.organization_id!).single();
      if (error) throw error;
      return (await withOrgPrivateOne(data)) as Organization & { government_regions?: any };
    },
    enabled: !!profile?.organization_id,
  });

  const regions = (myOrg?.government_regions as GovernmentRegions) ?? null;
  const hasRegions = !!regions && (
    (!!regions.is_state_wide && !!regions.state) || (regions.cities?.length ?? 0) > 0 || (regions.counties?.length ?? 0) > 0
  );

  // Server-side scoped lookups: only rows inside the caller's configured regions (none if unconfigured).
  const { data: locsRaw = [] } = useQuery({
    queryKey: ["gov-region-locs"],
    queryFn: async () => { const { data } = await supabase.rpc("gov_region_locations" as any); return ((data as any) || []) as any[]; },
  });
  const locs = hasRegions ? locsRaw : [];
  const regionFilteredLocs = locs;

  const regionLocIds = useMemo(() => new Set(regionFilteredLocs.map((l: any) => l.id)), [regionFilteredLocs]);

  const { data: listings = [] } = useQuery({
    queryKey: ["gov-region-listings"],
    queryFn: async () => { const { data } = await supabase.rpc("gov_region_listings" as any); return ((data as any) || []) as FoodListing[]; },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["gov-region-reports"],
    queryFn: async () => { const { data } = await supabase.rpc("gov_region_impact_reports" as any); return ((data as any) || []) as ImpactReport[]; },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs"],
    queryFn: async () => { const { data } = await supabase.from("organizations_public").select("*"); return (data || []) as unknown as Organization[]; },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["gov-nonprofits"],
    queryFn: async () => { const { data } = await supabase.from("nonprofits_public").select("*"); return (data || []) as unknown as Nonprofit[]; },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const cities = useMemo(() => [...new Set(regionFilteredLocs.map((l: any) => l.city).filter(Boolean))].sort(), [regionFilteredLocs]);

  // Scope "Active Organizations" and "Active Nonprofits" counts to the
  // government user's assigned region. Previously these counts included every
  // approved org/nonprofit across the entire platform.
  const regionOrgs = useMemo(() => filterByRegion(orgs, regions), [orgs, regions]);
  const regionNonprofits = useMemo(() => filterByRegion(nonprofits, regions), [nonprofits, regions]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (!regionLocIds.has(l.location_id)) return false;
      if (filterCity !== "all") {
        const loc = locs.find((lo: any) => lo.id === l.location_id);
        if (loc?.city !== filterCity) return false;
      }
      return true;
    });
  }, [listings, filterCity, regionLocIds, locs]);

  const completedListings = filteredListings.filter((l) => l.status === "completed");
  const totalPounds = completedListings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const totalValue = completedListings.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const est = estimateImpact(totalPounds);
  const co2 = est.co2Lbs;
  const trend = useMemo(() => monthlyTrend(completedListings.map((l) => ({ date: l.picked_up_at || l.created_at, pounds: l.pounds || 0 })), IMPACT_FACTORS.MEALS_PER_LB), [completedListings]);

  const { data: goal } = useQuery({
    queryKey: ["gov-waste-goal", profile?.organization_id],
    queryFn: async () => (await (supabase as any).from("gov_waste_goals").select("*").eq("organization_id", profile!.organization_id!).maybeSingle()).data,
    enabled: !!profile?.organization_id,
  });
  const goalProgress = useMemo(() => {
    if (!goal) return 0;
    return completedListings.filter((l) => {
      const d = (l.picked_up_at || l.created_at || "").slice(0, 10);
      return d >= goal.period_start && d <= goal.period_end;
    }).reduce((s, l) => s + (l.pounds || 0), 0);
  }, [goal, completedListings]);

  const regionLabel = regions
    ? regions.is_state_wide ? `Statewide: ${regions.state || "All"}`
      : regions.cities?.length ? `Cities: ${regions.cities.join(", ")}`
        : regions.counties?.length ? `Counties: ${regions.counties.join(", ")}` : "No regions configured"
    : "No regions configured";

  const orgRanking = useMemo(() => {
    const map: Record<string, number> = {};
    completedListings.forEach((l) => { map[l.organization_id] = (map[l.organization_id] || 0) + (l.pounds || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([id, pounds]) => ({ org: orgMap[id], pounds })).filter((r) => r.org);
  }, [completedListings, orgMap]);

  const metrics = [
    { label: "Total Pounds Diverted", value: `${totalPounds.toLocaleString()} lbs`, icon: Leaf },
    { label: "Meals Served (reported)", value: totalMeals.toLocaleString(), icon: Trophy },
    { label: "Est. Donation Value", value: `$${totalValue.toLocaleString()}`, icon: BarChart3 },
    { label: "Est. Meals Rescued", value: est.meals.toLocaleString(), icon: Trophy },
    { label: "Est. CO₂e Avoided", value: `${co2.toLocaleString()} lbs`, icon: Leaf },
    { label: "Est. Water Saved", value: `${est.waterGal.toLocaleString()} gal`, icon: Droplets },
    { label: "Landfill Diverted", value: `${est.landfillLbs.toLocaleString()} lbs`, icon: Trash2 },
    { label: "Active Organizations", value: regionOrgs.filter((o) => o.approval_status === "approved").length.toString(), icon: Building2 },
    { label: "Active Nonprofits", value: regionNonprofits.filter((n) => n.approval_status === "approved").length.toString(), icon: Heart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Regional impact metrics and food diversion data</p>
        <p className="text-xs text-primary font-medium mt-2 bg-primary/10 px-3 py-1.5 rounded-lg inline-block">{regionLabel}</p>
        <div className="mt-3">
          <Button disabled={!hasRegions} onClick={() => downloadGovImpactPdf({
            jurisdiction: myOrg?.name || "Government partner", regionLabel: filterCity === "all" ? regionLabel : `${regionLabel} · ${filterCity}`,
            generatedAt: new Date(), metrics: metrics.map((m) => ({ label: m.label, value: m.value })), trend,
            organizations: orgRanking.map((o) => ({ name: o.org!.name, pounds: o.pounds })),
            goal: goal ? { goalLbs: Number(goal.goal_lbs), progressLbs: goalProgress, periodStart: goal.period_start, periodEnd: goal.period_end } : null,
          })}><FileDown className="w-4 h-4 mr-1" /> Download grant-ready PDF</Button>
        </div>
      </div>
      {myOrg && !hasRegions && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
          No regions are configured for your account, so no listings or locations can be shown. Please contact an admin to set up your jurisdiction.
        </div>
      )}

      <div className="flex gap-3">
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><m.icon className="w-4 h-4" />{m.label}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      <ImpactMethodologyNote />

      <div className="bg-card rounded-xl border p-6 space-y-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Target className="w-5 h-5" />Waste-reduction goal</h2>
        {goal ? (
          <>
            <p className="text-sm text-muted-foreground">{goalProgress.toLocaleString()} of {Number(goal.goal_lbs).toLocaleString()} lbs diverted · {goal.period_start} to {goal.period_end}</p>
            <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (goalProgress / Number(goal.goal_lbs)) * 100)}%` }} /></div>
            <p className="text-xs text-muted-foreground">{Math.min(100, Math.round((goalProgress / Number(goal.goal_lbs)) * 100))}% of goal</p>
          </>
        ) : <p className="text-sm text-muted-foreground">No goal set yet. Ask your Hariet.AI admin to set a waste-reduction goal for your jurisdiction.</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Pounds diverted per month</h2>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="pounds" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Estimated meals per month</h2>
          <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line dataKey="meals" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
        </div>
      </div>

      <CityCounterEmbed cities={cities as string[]} defaultState={regions?.state || (locs[0] as any)?.state || ""} />

      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Building2 className="w-5 h-5" />Participating Organizations</h2>
        {orgRanking.length === 0 ? <p className="text-sm text-muted-foreground">No data yet for your assigned regions.</p> : (
          <div className="space-y-3">
            {orgRanking.map((r, i) => (
              <div key={r.org!.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                <Link to={`/government/organizations/${r.org!.id}`} className="text-sm font-medium text-foreground flex-1 hover:underline">{r.org!.name}</Link>
                <p className="text-sm font-bold text-foreground">{r.pounds.toLocaleString()} lbs</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
