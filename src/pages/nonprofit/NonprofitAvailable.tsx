import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { FoodListing } from "@/types/database";

export default function NonprofitAvailable() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filterFoodType, setFilterFoodType] = useState("all");

  const { data: available = [] } = useQuery({
    queryKey: ["available-donations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("listing_type", "donation").eq("status", "posted").is("nonprofit_claimed_id", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const orgIds = useMemo(() => [...new Set(available.map((l) => l.organization_id))], [available]);
  const { data: orgs = [] } = useQuery({
    queryKey: ["np-orgs", orgIds],
    queryFn: async () => {
      if (!orgIds.length) return [];
      const { data } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      return data || [];
    },
    enabled: orgIds.length > 0,
  });
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);

  const claimDonation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("food_listings").update({
        nonprofit_claimed_id: profile!.nonprofit_id!, status: "claimed" as const,
      }).eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-donations"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast.success("Donation claimed!");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = filterFoodType === "all" ? available : available.filter((d) => d.food_type === filterFoodType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Available Donations</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and claim available food donations</p>
      </div>

      <div className="flex gap-3">
        <Select value={filterFoodType} onValueChange={setFilterFoodType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Food Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="prepared_meals">Prepared Meals</SelectItem>
            <SelectItem value="produce">Produce</SelectItem>
            <SelectItem value="dairy">Dairy</SelectItem>
            <SelectItem value="meat_protein">Meat / Protein</SelectItem>
            <SelectItem value="baked_goods">Baked Goods</SelectItem>
            <SelectItem value="shelf_stable">Shelf Stable</SelectItem>
            <SelectItem value="frozen">Frozen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Food Type</TableHead>
              <TableHead>Pounds</TableHead>
              <TableHead>Pickup Window</TableHead>
              <TableHead>Pickup Address</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No available donations right now. Check back soon!</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{orgMap[d.organization_id] || "—"}</TableCell>
                <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                <TableCell>{d.pounds || "—"}</TableCell>
                <TableCell>{d.pickup_window_start ? new Date(d.pickup_window_start).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{d.pickup_address || "—"}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => claimDonation.mutate(d.id)} disabled={claimDonation.isPending}>Claim</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
