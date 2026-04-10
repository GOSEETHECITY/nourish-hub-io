import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Heart, BarChart3, CheckCircle } from "lucide-react";
import type { FoodListing, ImpactReport, Nonprofit } from "@/types/database";

export default function NonprofitDashboardHome() {
  const { profile } = useAuth();

  const { data: nonprofit } = useQuery({
    queryKey: ["my-nonprofit", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("*").eq("id", profile!.nonprofit_id!).single();
      if (error) throw error;
      return data as Nonprofit;
    },
    enabled: !!profile?.nonprofit_id,
  });

  const { data: available = [] } = useQuery({
    queryKey: ["available-donations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("listing_type", "donation").eq("status", "posted").is("nonprofit_claimed_id", null);
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const { data: claimed = [] } = useQuery({
    queryKey: ["my-claims", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("nonprofit_claimed_id", profile!.nonprofit_id!);
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["my-reports", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_reports").select("*").eq("nonprofit_id", profile!.nonprofit_id!);
      if (error) throw error;
      return data as ImpactReport[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  // Pounds Received should only count donations that have actually been
  // delivered / impact-reported (status = "completed"). Counting claimed-but-
  // not-yet-picked-up donations overstates the nonprofit's real impact and
  // diverges from the government dashboard which already filters on completed.
  const totalPounds = claimed
    .filter((l) => l.status === "completed")
    .reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const completedCount = claimed.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{nonprofit?.organization_name || "Loading..."}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Available Donations</p>
          <p className="text-3xl font-bold text-foreground mt-2">{available.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Heart className="w-4 h-4" />Pounds Received</p>
          <p className="text-3xl font-bold text-foreground mt-2">{totalPounds.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />Meals Served</p>
          <p className="text-3xl font-bold text-foreground mt-2">{totalMeals.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4" />Completed</p>
          <p className="text-3xl font-bold text-foreground mt-2">{completedCount}</p>
        </div>
      </div>
    </div>
  );
}
