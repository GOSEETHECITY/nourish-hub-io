import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Leaf, DollarSign, BarChart3, MapPin } from "lucide-react";
import OnboardingChecklist from "@/components/venue/OnboardingChecklist";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CO2_LBS_PER_LB_FOOD } from "@/lib/co2";
import type { FoodListing, Location } from "@/types/database";

export default function VenueDashboardHome() {
  const { profile } = useAuth();

  const { data: locations = [] } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["venue-listings", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.organization_id,
  });

  // Get the city from first location
  const venueCity = locations[0]?.city || null;

  const { data: cityThreshold } = useQuery({
    queryKey: ["city-threshold", venueCity],
    queryFn: async () => {
      const { data } = await supabase.from("city_thresholds").select("*").ilike("city", venueCity!).maybeSingle();
      return data;
    },
    enabled: !!venueCity,
  });

  const donations = listings.filter((l) => l.listing_type === "donation");
  const currentYear = new Date().getFullYear();
  const yearDonations = donations.filter((l) => {
    const d = l.created_at ? new Date(l.created_at) : null;
    return d && d.getFullYear() === currentYear;
  });
  const yearCount = yearDonations.length;
  const yearPounds = yearDonations.reduce((s, l) => s + (l.pounds || 0), 0);
  const yearValue = yearDonations.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
  const yearCo2 = yearPounds * CO2_LBS_PER_LB_FOOD;
  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  const marketplaceUnlocked = Boolean(cityThreshold?.marketplace_unlocked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your food listings and impact</p>
      </div>

      <OnboardingChecklist />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Active Donations</p>
          <p className="text-3xl font-bold text-foreground mt-2">{activeDonations}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Leaf className="w-4 h-4" />Pounds Diverted</p>
          <p className="text-3xl font-bold text-foreground mt-2">{totalPounds.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />Donation Value</p>
          <p className="text-3xl font-bold text-foreground mt-2">${totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />CO₂ Prevented</p>
          <p className="text-3xl font-bold text-foreground mt-2">{co2.toLocaleString()} lbs</p>
        </div>
      </div>

      {/* Marketplace status */}
      {venueCity && (
        <div className="bg-card rounded-xl border p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Marketplace — {venueCity}</h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              marketplaceUnlocked
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {marketplaceUnlocked ? "Marketplace Unlocked" : "Coming Soon"}
          </span>
        </div>
      )}

      {/* Recent Donations */}
      <div className="bg-card rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-foreground">Recent Donations</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Food Type</TableHead>
              <TableHead>Pounds</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No donations posted yet — click "Donations" in the sidebar to get started.</TableCell></TableRow>
            ) : donations.slice(0, 10).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{locMap[d.location_id] || "—"}</TableCell>
                <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                <TableCell>{d.pounds || "—"}</TableCell>
                <TableCell>{d.estimated_donation_value ? `$${d.estimated_donation_value}` : "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${d.status === "posted" ? "bg-chart-1/15 text-chart-1" : d.status === "completed" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{formatStatus(d.status)}</span></TableCell>
                <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
