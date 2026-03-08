import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, Heart, BarChart3, MapPin, Settings, Headphones } from "lucide-react";
import PartnerDashboardLayout from "@/components/layout/PartnerDashboardLayout";
import type { NavItem } from "@/components/layout/PartnerDashboardLayout";
import type { NonprofitLocation } from "@/types/database";

export default function NonprofitDashboard() {
  const { profile } = useAuth();

  const { data: locations = [] } = useQuery({
    queryKey: ["np-locations", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofit_locations").select("id, name").eq("nonprofit_id", profile!.nonprofit_id!);
      if (error) throw error;
      return data as Pick<NonprofitLocation, "id" | "name">[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  if (!profile?.nonprofit_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-xl border p-12 text-center max-w-md">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Nonprofit Linked</h2>
          <p className="text-sm text-muted-foreground">Your account is not linked to a nonprofit organization yet. Please contact an admin.</p>
        </div>
      </div>
    );
  }

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/nonprofit" },
    { icon: Package, label: "Available Donations", path: "/nonprofit/available" },
    { icon: Heart, label: "Claimed Donations", path: "/nonprofit/claimed" },
    { icon: BarChart3, label: "Impact Reports", path: "/nonprofit/reports" },
    { icon: MapPin, label: "Distribution Locations", path: "/nonprofit/locations" },
  ];

  const otherNavItems: NavItem[] = [
    { icon: Settings, label: "Settings", path: "/nonprofit/settings" },
    { icon: Headphones, label: "Support", path: "/nonprofit/support" },
  ];

  return (
    <PartnerDashboardLayout
      roleLabel="Nonprofit Partner"
      navItems={navItems}
      otherNavItems={otherNavItems}
      switcherItems={locations.map((l) => ({ id: l.id, name: l.name }))}
    />
  );
}
