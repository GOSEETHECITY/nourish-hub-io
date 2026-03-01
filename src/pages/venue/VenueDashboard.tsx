import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function VenueDashboard() {
  const { profile } = useAuth();

  // Check if venue has completed onboarding (has at least one location)
  const { data: locations, isLoading } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id").eq("organization_id", profile!.organization_id!).limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  if (isLoading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  // If no locations, redirect to onboarding
  if (!profile?.organization_id || !locations || locations.length === 0) {
    return <Navigate to="/venue/onboarding" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Venue Partner Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your food listings, locations, and marketplace</p>
      </div>
      <div className="bg-card rounded-xl border p-12 text-center">
        <p className="text-muted-foreground">Venue Partner dashboard coming soon.</p>
      </div>
    </div>
  );
}
