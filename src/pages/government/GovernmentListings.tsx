import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FoodListing, Organization } from "@/types/database";

export default function GovernmentListings() {
  const { profile } = useAuth();

  const { data: myOrg } = useQuery({
    queryKey: ["my-gov-org", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("*").eq("id", profile!.organization_id!).single();
      return data as Organization & { government_regions?: any };
    },
    enabled: !!profile?.organization_id,
  });

  const regions = myOrg?.government_regions as any;

  const { data: locs = [] } = useQuery({
    queryKey: ["gov-locs"],
    queryFn: async () => { const { data } = await supabase.from("locations").select("id, organization_id, city, state, county"); return data || []; },
  });

  const regionLocIds = useMemo(() => {
    if (!regions) return new Set(locs.map((l: any) => l.id));
    return new Set(locs.filter((l: any) => {
      if (regions.is_state_wide && regions.state) return l.state?.toLowerCase() === regions.state.toLowerCase();
      if (regions.cities?.length) return regions.cities.some((c: string) => l.city?.toLowerCase() === c.toLowerCase());
      if (regions.counties?.length) return regions.counties.some((c: string) => l.county?.toLowerCase() === c.toLowerCase());
      return true;
    }).map((l: any) => l.id));
  }, [locs, regions]);

  const { data: listings = [] } = useQuery({
    queryKey: ["gov-listings"],
    queryFn: async () => { const { data } = await supabase.from("food_listings").select("*").order("created_at", { ascending: false }); return (data || []) as FoodListing[]; },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs"],
    queryFn: async () => { const { data } = await supabase.from("organizations").select("id, name"); return data || []; },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);
  const filtered = listings.filter((l) => regionLocIds.has(l.location_id));
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Food Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">All food listings in your assigned region (read only)</p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Food Type</TableHead><TableHead>Pounds</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No food listings found in your assigned regions.</TableCell></TableRow>
            ) : filtered.slice(0, 50).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{orgMap[l.organization_id] || "—"}</TableCell>
                <TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                <TableCell>{l.pounds || "—"}</TableCell>
                <TableCell className="capitalize">{formatStatus(l.status)}</TableCell>
                <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
