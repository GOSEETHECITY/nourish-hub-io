import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FoodListing, ImpactReport } from "@/types/database";

const formatFoodType = (t?: string | null) => (t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Donation");

export default function GovernmentImpactReports() {
  const { data: reports = [] } = useQuery({
    queryKey: ["gov-impact-reports"],
    queryFn: async () => {
      const { data } = await supabase.rpc("gov_region_impact_reports" as any);
      return ((data as any) || []) as ImpactReport[];
    },
  });

  // Same server-scoped lookup used by the listings page — only listings in the caller's region.
  const { data: listings = [] } = useQuery({
    queryKey: ["gov-region-listings"],
    queryFn: async () => { const { data } = await supabase.rpc("gov_region_listings" as any); return ((data as any) || []) as FoodListing[]; },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs-names"],
    queryFn: async () => { const { data } = await supabase.from("organizations_public").select("id, name"); return data || []; },
  });

  const listingMap = useMemo(() => Object.fromEntries(listings.map((l) => [l.id, l])), [listings]);
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);

  const summarize = (l?: FoodListing) => {
    if (!l) return "Donation";
    const parts = [formatFoodType(l.food_type)];
    if (l.pounds) parts.push(`${Number(l.pounds).toLocaleString()} lbs`);
    const date = l.pickup_window_start || l.created_at;
    if (date) parts.push(new Date(date).toLocaleDateString());
    return parts.join(" · ");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impact Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">All submitted impact reports in your region (read only)</p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Donation</TableHead><TableHead>Meals Served</TableHead><TableHead>Date Distributed</TableHead><TableHead>Notes</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No impact reports submitted yet.</TableCell></TableRow>
            ) : reports.map((r) => {
              const l = listingMap[r.food_listing_id];
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{(l && orgMap[l.organization_id]) || "—"}</TableCell>
                  <TableCell>{summarize(l)}</TableCell>
                  <TableCell className="font-medium">{r.meals_served || "—"}</TableCell>
                  <TableCell>{r.date_distributed ? new Date(r.date_distributed).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.notes || "—"}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
