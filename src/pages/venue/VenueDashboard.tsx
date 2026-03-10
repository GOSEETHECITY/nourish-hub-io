import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { LayoutDashboard, Package, Store, BarChart3, Leaf, MapPin, Settings, Headphones } from "lucide-react";
import PartnerDashboardLayout from "@/components/layout/PartnerDashboardLayout";
import { MARKETPLACE_ELIGIBLE_TYPES } from "@/lib/marketplace";
import type { Location } from "@/types/database";
import type { NavItem } from "@/components/layout/PartnerDashboardLayout";

export default function VenueDashboard() {
  const { profile } = useAuth();

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: org } = useQuery({
    queryKey: ["venue-org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("name").eq("id", profile!.organization_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile?.organization_id || locations.length === 0) return <Navigate to="/venue/onboarding" replace />;

  const hasMarketplace = locations.some((l) => l.marketplace_enabled || MARKETPLACE_ELIGIBLE_TYPES.includes((l as any).location_type || ""));

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/venue" },
    { icon: Package, label: "Donations", path: "/venue/donations" },
    ...(hasMarketplace ? [{ icon: Store, label: "Marketplace", path: "/venue/marketplace" }] : []),
    { icon: BarChart3, label: "Impact", path: "/venue/impact" },
    { icon: Leaf, label: "Sustainability Baseline", path: "/venue/baseline" },
    { icon: MapPin, label: "Locations", path: "/venue/locations" },
  ];

  const otherNavItems: NavItem[] = [
    { icon: Settings, label: "Settings", path: "/venue/settings" },
    { icon: Headphones, label: "Support", path: "/venue/support" },
  ];

  return (
    <PartnerDashboardLayout
      roleLabel="Venue Partner"
      navItems={navItems}
      otherNavItems={otherNavItems}
      switcherItems={locations.map((l) => ({ id: l.id, name: l.name }))}
    />
  );
}
