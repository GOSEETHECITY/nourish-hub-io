import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { FoodListing } from "@/types/database";
import { geocode } from "@/lib/cityCenter";
import { haversineMiles, formatDistance } from "@/lib/geo";
import PickupMethodDialog from "@/components/nonprofit/PickupMethodDialog";

export default function NonprofitAvailable() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filterFoodType, setFilterFoodType] = useState("all");
  const [radius, setRadius] = useState("25");
  const [choosing, setChoosing] = useState<string | null>(null);
  const [claimedForDriver, setClaimedForDriver] = useState(false);

  // The nonprofit's saved address is the origin for distance filtering and sorting.
  const { data: origin, isFetched: originFetched } = useQuery({
    queryKey: ["np-origin", profile?.nonprofit_id],
    queryFn: async () => {
      const { data } = await supabase.from("nonprofits").select("address, city, state, zip").eq("id", profile!.nonprofit_id!).maybeSingle();
      const addr = [data?.address, data?.city, data?.state, data?.zip].filter(Boolean).join(", ");
      if (!addr) return null;
      return (await geocode(addr)) ?? (data?.city ? await geocode([data.city, data.state].filter(Boolean).join(", ")) : null);
    },
    enabled: !!profile?.nonprofit_id,
    staleTime: Infinity,
  });

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
      const { data } = await supabase.from("organizations_public").select("id, name").in("id", orgIds);
      return data || [];
    },
    enabled: orgIds.length > 0,
  });
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);

  const claimDonation = useMutation({
    mutationFn: async (listingId: string) => {
      const { data, error } = await supabase.from("food_listings").update({
        nonprofit_claimed_id: profile!.nonprofit_id!, status: "claimed" as const,
      }).eq("id", listingId).eq("status", "posted").is("nonprofit_claimed_id", null).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        queryClient.invalidateQueries({ queryKey: ["available-donations"] });
        throw new Error("Sorry, this donation was already claimed by another nonprofit.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-donations"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const withDistance = useMemo(() => available.map((d) => {
    const lat = (d as any).latitude != null ? Number((d as any).latitude) : null;
    const lng = (d as any).longitude != null ? Number((d as any).longitude) : null;
    const miles = origin && lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? haversineMiles(origin.lat, origin.lng, lat, lng) : null;
    return { ...d, miles };
  }), [available, origin]);

  const filtered = useMemo(() => {
    const maxMiles = radius === "any" ? Infinity : Number(radius);
    return withDistance
      .filter((d) => filterFoodType === "all" || d.food_type === filterFoodType)
      // Without a usable origin we cannot measure distance, so the radius cannot be applied.
      .filter((d) => !origin || radius === "any" || (d.miles != null && d.miles <= maxMiles))
      .sort((a, b) => (a.miles ?? Infinity) - (b.miles ?? Infinity));
  }, [withDistance, filterFoodType, radius, origin]);

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
        <Select value={radius} onValueChange={setRadius}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Distance" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Within 5 miles</SelectItem>
            <SelectItem value="10">Within 10 miles</SelectItem>
            <SelectItem value="25">Within 25 miles</SelectItem>
            <SelectItem value="50">Within 50 miles</SelectItem>
            <SelectItem value="100">Within 100 miles</SelectItem>
            <SelectItem value="any">Any distance</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {originFetched && !origin && (
        <p className="text-sm text-muted-foreground">We couldn't locate your saved address, so distances can't be shown. Add a full address in Settings to see the nearest donations first.</p>
      )}

      <div className="bg-card rounded-xl border">
        <div className="overflow-x-auto"><Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Food Type</TableHead>
              <TableHead>Pounds</TableHead>
              <TableHead>Pickup Window</TableHead>
              <TableHead>Pickup Address</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No available donations in this area right now. Try a wider distance, or check back as venues list surplus.</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{orgMap[d.organization_id] || "—"}</TableCell>
                <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                <TableCell>{d.pounds || "—"}</TableCell>
                <TableCell>{d.pickup_window_start ? new Date(d.pickup_window_start).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{d.pickup_address || "—"}</TableCell>
                <TableCell>{d.miles != null ? formatDistance(d.miles) : "—"}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => { setClaimedForDriver(false); setChoosing(d.id); }} disabled={claimDonation.isPending}>Claim</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
      </div>
      <PickupMethodDialog
        open={!!choosing}
        onOpenChange={(o) => { if (!o) setChoosing(null); }}
        listingId={choosing}
        busy={claimDonation.isPending}
        onSelfPickup={async () => {
          try {
            if (!claimedForDriver) await claimDonation.mutateAsync(choosing!);
            toast.success("Donation claimed! Track pickup under Claimed Donations.");
            setChoosing(null);
          } catch { setChoosing(null); }
        }}
        onBeforeDriver={async () => {
          if (claimedForDriver) return true;
          try { await claimDonation.mutateAsync(choosing!); setClaimedForDriver(true); toast.success("Donation claimed — now book your driver."); return true; }
          catch { setChoosing(null); return false; }
        }}
      />
    </div>
  );
}
