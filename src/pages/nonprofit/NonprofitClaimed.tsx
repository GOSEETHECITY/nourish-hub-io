import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FoodListing } from "@/types/database";

export default function NonprofitClaimed() {
  const { profile } = useAuth();

  const { data: claimed = [] } = useQuery({
    queryKey: ["my-claims", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("nonprofit_claimed_id", profile!.nonprofit_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const orgIds = useMemo(() => [...new Set(claimed.map((l) => l.organization_id))], [claimed]);
  const { data: orgs = [] } = useQuery({
    queryKey: ["np-claim-orgs", orgIds],
    queryFn: async () => {
      if (!orgIds.length) return [];
      const { data } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      return data || [];
    },
    enabled: orgIds.length > 0,
  });
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Claimed Donations</h1>
        <p className="text-sm text-muted-foreground mt-1">History of all donations you have claimed</p>
      </div>

      <div className="bg-card rounded-xl border">
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
            {claimed.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">You haven't claimed any donations yet.</TableCell></TableRow>
            ) : claimed.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{orgMap[d.organization_id] || "—"}</TableCell>
                <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                <TableCell>{d.pounds || "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${d.status === "completed" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{formatStatus(d.status)}</span></TableCell>
                <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
