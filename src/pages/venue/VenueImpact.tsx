import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Leaf, Trophy, Droplets, TreeDeciduous, Trash2 } from "lucide-react";
import type { FoodListing, ImpactReport } from "@/types/database";

export default function VenueImpact() {
  const { profile } = useAuth();

  const { data: listings = [] } = useQuery({
    queryKey: ["venue-impact-listings", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("organization_id", profile!.organization_id!).eq("listing_type", "donation");
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.organization_id,
  });

  const completedIds = useMemo(() => listings.filter((l) => l.status === "completed").map((l) => l.id), [listings]);

  const { data: reports = [] } = useQuery({
    queryKey: ["venue-impact-reports", completedIds],
    queryFn: async () => {
      if (!completedIds.length) return [];
      const { data, error } = await supabase.from("impact_reports").select("*").in("food_listing_id", completedIds);
      if (error) throw error;
      return data as ImpactReport[];
    },
    enabled: completedIds.length > 0,
  });

  const totalPounds = listings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalValue = listings.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const co2 = totalPounds * 3.8;
  const water = totalPounds * 108;
  const trees = co2 / 48;

  const metrics = [
    { label: "Total Pounds Diverted", value: `${totalPounds.toLocaleString()} lbs`, icon: Leaf },
    { label: "Total Meals Served", value: totalMeals.toLocaleString(), icon: Trophy },
    { label: "Est. Donation Value", value: `$${totalValue.toLocaleString()}`, icon: Trophy },
    { label: "CO₂ Prevented", value: `${co2.toLocaleString()} lbs`, icon: Leaf },
    { label: "Water Saved", value: `${water.toLocaleString()} gal`, icon: Droplets },
    { label: "Landfill Diverted", value: `${totalPounds.toLocaleString()} lbs`, icon: Trash2 },
    { label: "Equiv. Trees Planted", value: Math.round(trees).toLocaleString(), icon: TreeDeciduous },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impact</h1>
        <p className="text-sm text-muted-foreground mt-1">Your sustainability metrics and environmental impact</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><m.icon className="w-4 h-4" />{m.label}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Impact Reports */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Impact Reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No impact reports submitted by nonprofits for your donations yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{r.meals_served?.toLocaleString() || 0} meals served</p>
                  <p className="text-xs text-muted-foreground">{r.date_distributed ? new Date(r.date_distributed).toLocaleDateString() : "—"} • {r.notes || "No notes"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
