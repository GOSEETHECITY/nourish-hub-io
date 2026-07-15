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

  const { data: org } = useQuery({
    queryKey: ["venue-org-header", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("marketplace_enabled").eq("id", profile!.organization_id!).maybeSingle();
      return data as { marketplace_enabled: boolean } | null;
    },
    enabled: !!profile?.organization_id,
  });
  const marketplaceEnabled = !!org?.marketplace_enabled;

  // Get the city from first location
  const venueCity = locations[0]?.city || null;

  const { data: cityThreshold } = useQuery({
    queryKey: ["city-threshold", venueCity],
    queryFn: async () => {
      const { data } = await supabase.from("city_thresholds").select("*").ilike("city", venueCity!).maybeSingle();
      return data;
    },
    enabled: !!venueCity && marketplaceEnabled,
  });


  // Per-city marketplace status (for multi-city orgs)
  const uniqueCities = Array.from(new Set(locations.map((l) => l.city).filter(Boolean))) as string[];
  const { data: cityStatuses = [] } = useQuery({
    queryKey: ["city-thresholds-all", uniqueCities.join(",")],
    queryFn: async () => {
      if (uniqueCities.length === 0) return [];
      const { data } = await supabase.from("city_thresholds").select("city, marketplace_unlocked").in("city", uniqueCities);
      return data || [];
    },
    enabled: uniqueCities.length > 1 && marketplaceEnabled,

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

  // Per-location rollup for multi-location orgs
  const isMultiLocation = locations.length > 1;
  const perLocation = isMultiLocation
    ? locations.map((loc) => {
        const locDonations = donations.filter((d) => d.location_id === loc.id);
        const locYear = locDonations.filter((l) => l.created_at && new Date(l.created_at).getFullYear() === currentYear);
        const pounds = locYear.reduce((s, l) => s + (l.pounds || 0), 0);
        const value = locYear.reduce((s, l) => s + (l.estimated_donation_value || 0), 0);
        return { id: loc.id, name: loc.name, city: loc.city, count: locYear.length, pounds, value, co2: pounds * CO2_LBS_PER_LB_FOOD };
      })
    : [];

  const marketplaceUnlocked = Boolean(cityThreshold?.marketplace_unlocked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your food listings and impact</p>
      </div>

      <OnboardingChecklist />

      {isMultiLocation && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Organization Rollup</h2>
            <span className="text-xs text-muted-foreground">{locations.length} locations · combined this year</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><p className="text-xs text-muted-foreground">Donations</p><p className="text-2xl font-bold">{yearCount.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Value</p><p className="text-2xl font-bold">${yearValue.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Pounds</p><p className="text-2xl font-bold">{yearPounds.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">CO₂ (lbs)</p><p className="text-2xl font-bold">{yearCo2.toLocaleString()}</p></div>
          </div>
          {marketplaceEnabled && cityStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {cityStatuses.map((c: any) => (
                <span key={c.city} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.marketplace_unlocked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {c.city}: {c.marketplace_unlocked ? "Unlocked" : "Coming soon"}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {perLocation.map((loc) => (
              <a key={loc.id} href={`/venue/locations`} className="block bg-card border rounded-lg p-3 hover:border-primary transition-colors">
                <p className="font-semibold text-sm truncate">{loc.name}</p>
                <p className="text-xs text-muted-foreground">{loc.city}</p>
                <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                  <div><span className="text-muted-foreground">Don</span><p className="font-bold">{loc.count}</p></div>
                  <div><span className="text-muted-foreground">Lbs</span><p className="font-bold">{loc.pounds}</p></div>
                  <div><span className="text-muted-foreground">$</span><p className="font-bold">{loc.value}</p></div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Donations Made</p>
          <p className="text-3xl font-bold text-foreground mt-2">{yearCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">This year</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />Donation Value</p>
          <p className="text-3xl font-bold text-foreground mt-2">${yearValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">This year</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Leaf className="w-4 h-4" />Pounds Diverted</p>
          <p className="text-3xl font-bold text-foreground mt-2">{yearPounds.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">This year</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />CO₂ Prevented</p>
          <p className="text-3xl font-bold text-foreground mt-2">{yearCo2.toLocaleString()} lbs</p>
          <p className="text-xs text-muted-foreground mt-1">This year</p>
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
