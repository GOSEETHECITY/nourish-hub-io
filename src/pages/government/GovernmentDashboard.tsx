import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Leaf, Trophy, Building2, Heart, Droplets, TreeDeciduous, Trash2, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FoodListing, ImpactReport, Organization, Nonprofit } from "@/types/database";

export default function GovernmentDashboard() {
  const { profile } = useAuth();
  const [filterCity, setFilterCity] = useState("all");
  const [filterState, setFilterState] = useState("all");

  // Load the government org to get assigned regions
  const { data: myOrg } = useQuery({
    queryKey: ["my-gov-org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", profile!.organization_id!).single();
      if (error) throw error;
      return data as Organization & { government_regions?: any };
    },
    enabled: !!profile?.organization_id,
  });

  const regions = myOrg?.government_regions as { state?: string; cities?: string[]; counties?: string[]; is_state_wide?: boolean } | null;

  const { data: listings = [] } = useQuery({
    queryKey: ["gov-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*");
      if (error) throw error;
      return data as FoodListing[];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["gov-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_reports").select("*");
      if (error) throw error;
      return data as ImpactReport[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*");
      if (error) throw error;
      return data as Organization[];
    },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["gov-nonprofits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("*");
      if (error) throw error;
      return data as Nonprofit[];
    },
  });

  const { data: locs = [] } = useQuery({
    queryKey: ["gov-locs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, organization_id, city, state, county");
      if (error) throw error;
      return data as any[];
    },
  });

  const locMap = useMemo(() => Object.fromEntries(locs.map((l: any) => [l.id, l])), [locs]);
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);

  // Auto-filter locations by assigned regions
  const regionFilteredLocs = useMemo(() => {
    if (!regions) return locs;
    return locs.filter((l: any) => {
      if (regions.is_state_wide && regions.state) {
        return l.state?.toLowerCase() === regions.state.toLowerCase();
      }
      if (regions.cities?.length) {
        return regions.cities.some((c: string) => l.city?.toLowerCase() === c.toLowerCase()) &&
          (!regions.state || l.state?.toLowerCase() === regions.state.toLowerCase());
      }
      if (regions.counties?.length) {
        return regions.counties.some((c: string) => l.county?.toLowerCase() === c.toLowerCase()) &&
          (!regions.state || l.state?.toLowerCase() === regions.state.toLowerCase());
      }
      return true;
    });
  }, [locs, regions]);

  const regionLocIds = useMemo(() => new Set(regionFilteredLocs.map((l: any) => l.id)), [regionFilteredLocs]);

  const cities = useMemo(() => [...new Set(regionFilteredLocs.map((l: any) => l.city).filter(Boolean))].sort(), [regionFilteredLocs]);
  const states = useMemo(() => [...new Set(regionFilteredLocs.map((l: any) => l.state).filter(Boolean))].sort(), [regionFilteredLocs]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      // Must be in a location within assigned regions
      if (!regionLocIds.has(l.location_id)) return false;
      const loc = locMap[l.location_id];
      if (filterCity !== "all" && loc?.city !== filterCity) return false;
      if (filterState !== "all" && loc?.state !== filterState) return false;
      return true;
    });
  }, [listings, filterCity, filterState, locMap, regionLocIds]);

  const completedListings = filteredListings.filter((l) => l.status === "completed");
  const totalPounds = completedListings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const totalValue = completedListings.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const co2 = totalPounds * 3.8;
  const water = totalPounds * 108;
  const trees = co2 / 48;

  const orgRanking = useMemo(() => {
    const map: Record<string, number> = {};
    completedListings.forEach((l) => { map[l.organization_id] = (map[l.organization_id] || 0) + (l.pounds || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([id, pounds]) => ({ org: orgMap[id], pounds })).filter((r) => r.org).slice(0, 10);
  }, [completedListings, orgMap]);

  const npRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filteredListings.forEach((l) => {
      if (l.nonprofit_claimed_id) map[l.nonprofit_claimed_id] = (map[l.nonprofit_claimed_id] || 0) + (l.pounds || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([id, pounds]) => {
      const np = nonprofits.find((n) => n.id === id);
      return { np, pounds };
    }).filter((r) => r.np).slice(0, 10);
  }, [filteredListings, nonprofits]);

  const regionLabel = regions
    ? regions.is_state_wide
      ? `Statewide: ${regions.state || "All"}`
      : regions.cities?.length
        ? `Cities: ${regions.cities.join(", ")}`
        : regions.counties?.length
          ? `Counties: ${regions.counties.join(", ")}`
          : "All Regions"
    : "All Regions";

  const metrics = [
    { label: "Total Pounds Diverted", value: `${totalPounds.toLocaleString()} lbs`, icon: Leaf },
    { label: "Total Meals Served", value: totalMeals.toLocaleString(), icon: Trophy },
    { label: "Est. Donation Value", value: `$${totalValue.toLocaleString()}`, icon: BarChart3 },
    { label: "CO₂ Prevented", value: `${co2.toLocaleString()} lbs`, icon: Leaf },
    { label: "Water Saved", value: `${water.toLocaleString()} gal`, icon: Droplets },
    { label: "Landfill Diverted", value: `${totalPounds.toLocaleString()} lbs`, icon: Trash2 },
    { label: "Equiv. Trees Planted", value: Math.round(trees).toLocaleString(), icon: TreeDeciduous },
    { label: "Active Organizations", value: orgs.filter((o) => o.approval_status === "approved").length.toString(), icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Government Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Regional impact metrics and food diversion data</p>
          <p className="text-xs text-primary font-medium mt-2 bg-primary/10 px-3 py-1.5 rounded-lg inline-block">{regionLabel}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All States</SelectItem>{states.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-card rounded-xl border p-5">
              <p className="text-sm text-muted-foreground flex items-center gap-2"><m.icon className="w-4 h-4" />{m.label}</p>
              <p className="text-2xl font-bold text-foreground mt-2">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Building2 className="w-5 h-5" />Top Organizations by Pounds Diverted</h2>
            {orgRanking.length === 0 ? <p className="text-sm text-muted-foreground">No data yet for your assigned regions.</p> : (
              <div className="space-y-3">
                {orgRanking.map((r, i) => (
                  <div key={r.org!.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                    <p className="text-sm font-medium text-foreground flex-1">{r.org!.name}</p>
                    <p className="text-sm font-bold text-foreground">{r.pounds.toLocaleString()} lbs</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-card rounded-xl border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Heart className="w-5 h-5" />Top Nonprofits by Pounds Claimed</h2>
            {npRanking.length === 0 ? <p className="text-sm text-muted-foreground">No data yet for your assigned regions.</p> : (
              <div className="space-y-3">
                {npRanking.map((r, i) => (
                  <div key={r.np!.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
                    <p className="text-sm font-medium text-foreground flex-1">{r.np!.organization_name}</p>
                    <p className="text-sm font-bold text-foreground">{r.pounds.toLocaleString()} lbs</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent food listings */}
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Recent Food Listings</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Food Type</TableHead>
                  <TableHead>Pounds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.slice(0, 20).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No food listings found in your assigned regions.</TableCell></TableRow>
                ) : filteredListings.slice(0, 20).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{orgMap[l.organization_id]?.name || "—"}</TableCell>
                    <TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                    <TableCell>{l.pounds || "—"}</TableCell>
                    <TableCell className="capitalize">{l.status.replace(/_/g, " ")}</TableCell>
                    <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}