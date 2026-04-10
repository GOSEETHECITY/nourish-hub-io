import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Store, DollarSign, Ticket, Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatusChip from "@/components/admin/StatusChip";
import type { Organization, Location, Coupon } from "@/types/database";

export default function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: locations = [] } = useQuery({
    queryKey: ["marketplace-locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("marketplace_enabled", true);
      if (error) throw error;
      return data as Location[];
    },
  });

  const orgIds = useMemo(() => [...new Set(locations.map((l) => l.organization_id))], [locations]);

  const { data: orgs = [] } = useQuery({
    queryKey: ["marketplace-orgs", orgIds],
    queryFn: async () => {
      if (!orgIds.length) return [];
      const { data, error } = await supabase.from("organizations").select("*").in("id", orgIds);
      if (error) throw error;
      return data as Organization[];
    },
    enabled: orgIds.length > 0,
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["marketplace-coupons"],
    queryFn: async () => {
      const locIds = locations.map((l) => l.id);
      if (!locIds.length) return [];
      const { data, error } = await supabase.from("coupons").select("*").in("location_id", locIds);
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: locations.length > 0,
  });

  const totalPartners = orgs.length;
  // Count active coupons from marketplace-enabled locations only
  const totalCoupons = coupons.filter((c) => c.status === "active").length;
  const totalRevenue = coupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);
  const totalFee = coupons.reduce((s, c) => {
    const loc = locations.find((l) => l.id === c.location_id);
    return s + c.price * c.quantity_sold * (loc?.platform_fee_percentage || 0) / 100;
  }, 0);

  const getMarketplaceStatus = (orgId: string) => {
    const orgLocs = locations.filter((l) => l.organization_id === orgId);
    const hasStripe = orgLocs.some((l) => l.stripe_onboarding_status === "complete");
    if (hasStripe) return "active";
    return "pending";
  };

  const filteredOrgs = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter((o) => o.name.toLowerCase().includes(q));
  }, [orgs, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">Marketplace partners and surplus food coupon management (marketplace-enabled locations only)</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5"><p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />Active Partners</p><p className="text-3xl font-bold text-foreground mt-2">{totalPartners}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-sm text-muted-foreground flex items-center gap-2"><Ticket className="w-4 h-4" />Active Coupons</p><p className="text-3xl font-bold text-foreground mt-2">{totalCoupons}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" />Total Revenue</p><p className="text-3xl font-bold text-foreground mt-2">${totalRevenue.toFixed(2)}</p></div>
        <div className="bg-card rounded-xl border p-5"><p className="text-sm text-muted-foreground flex items-center gap-2"><Store className="w-4 h-4" />Platform Fee Earned</p><p className="text-3xl font-bold text-foreground mt-2">${totalFee.toFixed(2)}</p></div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search marketplace..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Partner Cards */}
      <div className="grid grid-cols-2 gap-4">
        {filteredOrgs.length === 0 ? (
          <div className="col-span-2 bg-card rounded-xl border p-12 text-center">
            <p className="text-muted-foreground">No marketplace partners yet.</p>
          </div>
        ) : filteredOrgs.map((org) => {
          const orgLocs = locations.filter((l) => l.organization_id === org.id);
          const orgCoupons = coupons.filter((c) => orgLocs.some((l) => l.id === c.location_id));
          const activeCoupons = orgCoupons.filter((c) => c.status === "active").length;
          const revenue = orgCoupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);
          const status = getMarketplaceStatus(org.id);
          const formatType = (t: string) => t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

          return (
            <div key={org.id} className="bg-card rounded-xl border p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/marketplace/${org.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{org.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatType(org.type)}</p>
                </div>
                <StatusChip status={status} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground">Active Locations</p><p className="text-lg font-bold text-foreground">{orgLocs.length}</p></div>
                <div><p className="text-xs text-muted-foreground">Active Coupons</p><p className="text-lg font-bold text-foreground">{activeCoupons}</p></div>
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold text-foreground">${revenue.toFixed(2)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
