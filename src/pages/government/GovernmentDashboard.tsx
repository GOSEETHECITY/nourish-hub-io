import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, UtensilsCrossed, Building2, Heart, BarChart3, Settings, Headphones } from "lucide-react";
import PartnerDashboardLayout from "@/components/layout/PartnerDashboardLayout";
import type { NavItem } from "@/components/layout/PartnerDashboardLayout";

export default function GovernmentDashboard() {
  const { profile } = useAuth();

  const { data: org } = useQuery({
    queryKey: ["gov-org-name", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("name").eq("id", profile!.organization_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/government" },
    { icon: UtensilsCrossed, label: "Food Listings", path: "/government/listings" },
    { icon: Building2, label: "Organizations", path: "/government/organizations" },
    { icon: Heart, label: "Nonprofits", path: "/government/nonprofits" },
    { icon: BarChart3, label: "Impact Reports", path: "/government/reports" },
  ];

  const otherNavItems: NavItem[] = [
    { icon: Settings, label: "Settings", path: "/government/settings" },
    { icon: Headphones, label: "Support", path: "/government/support" },
  ];

  return (
    <PartnerDashboardLayout
      roleLabel="Government Partner"
      navItems={navItems}
      otherNavItems={otherNavItems}
    />
  );
}
