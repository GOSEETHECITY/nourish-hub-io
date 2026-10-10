import { useMemo } from "react";
import { ORG_PUBLIC_COLUMNS, withOrgPrivateOne } from "@/lib/privateFields";
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
      const { data } = await supabase.from("organizations").select(ORG_PUBLIC_COLUMNS).eq("id", profile!.organization_id!).single();
      return (await withOrgPrivateOne(data)) as Organization & { government_regions?: any };
    },
    enabled: !!profile?.organization_id,
  });

  const regions = myOrg?.government_regions as any;
  const hasRegions = !!regions && (
    (regions.is_state_wide && !!regions.state) || (regions.cities?.length ?? 0) > 0 || (regions.counties?.length ?? 0) > 0
  );

  // Server-side scoped: returns only listings inside the caller's configured regions (none if unconfigured).
  const { data: listings = [] } = useQuery({
    queryKey: ["gov-region-listings"],
    queryFn: async () => { const { data } = await supabase.rpc("gov_region_listings" as any); return ((data as any) || []) as FoodListing[]; },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs"],
    queryFn: async () => { const { data } = await supabase.from("organizations_public").select("id, name"); return data || []; },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);
  const filtered = hasRegions ? listings : [];
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Food Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">All food listings in your assigned region (read only)</p>
      </div>
      {myOrg && !hasRegions && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
          No regions are configured for your account, so no listings or locations can be shown. Please contact an admin to set up your jurisdiction.
        </div>
      )}
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
