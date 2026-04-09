import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Utensils, Package, Heart, Building2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FoodListing, ImpactReport, Organization, Nonprofit } from "@/types/database";

/* Brand brown palette for charts */
const BRAND_BROWN = "#6d412a";
const BRAND_BROWN_LIGHT = "#a07452";
const BRAND_CREAM = "#d7b899";
const BRAND_CREAM_LIGHT = "#f0e4d4";

const PoundsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-4 py-2.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">
        Pounds: <span className="font-semibold text-foreground">{payload[0].value.toLocaleString()} lbs</span>
      </p>
    </div>
  );
};

const DonationsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-4 py-2.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">
        Donations: <span className="font-semibold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  );
};

const FOOD_TYPE_COLORS: Record<string, string> = {
  prepared_meals: BRAND_BROWN,
  produce: BRAND_BROWN_LIGHT,
  dairy: BRAND_CREAM,
  meat_protein: BRAND_CREAM_LIGHT,
  baked_goods: "#8b5e3c",
  shelf_stable: "#c4956a",
  frozen: "#e8d5c0",
};

const FOOD_TYPE_LABELS: Record<string, string> = {
  prepared_meals: "Prepared Meals",
  produce: "Produce",
  dairy: "Dairy",
  meat_protein: "Meat / Protein",
  baked_goods: "Baked Goods",
  shelf_stable: "Shelf-Stable",
  frozen: "Frozen",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CHIP: Record<string, string> = {
  posted: "bg-green-100 text-green-800",
  claimed: "bg-amber-100 text-amber-800",
  picked_up: "bg-blue-100 text-blue-800",
  pending_impact_report: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: listings = [] } = useQuery({
    queryKey: ["dashboard-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*");
      if (error) throw error;
      return data as FoodListing[];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["dashboard-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_reports").select("*");
      if (error) throw error;
      return data as ImpactReport[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["dashboard-orgs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*");
      if (error) throw error;
      return data as Organization[];
    },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["dashboard-nonprofits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("*");
      if (error) throw error;
      return data as Nonprofit[];
    },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);

  // KPI calculations
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const activeDonations = listings.filter((l) => l.listing_type === "donation" && ["posted", "claimed", "picked_up"].includes(l.status)).length;
  const approvedNonprofits = nonprofits.filter((n) => n.approval_status === "approved").length;
  const totalOrgs = orgs.length;

  const stats = [
    { title: "Total Meals Served", value: totalMeals.toLocaleString(), sub: `${reports.length} impact reports`, icon: Utensils },
    { title: "Active Donations", value: activeDonations.toString(), sub: "Currently available for pickup", icon: Package },
    { title: "Total Nonprofits", value: approvedNonprofits.toString(), sub: "Approved only", icon: Heart },
    { title: "Total Organizations", value: totalOrgs.toString(), sub: "All registered", icon: Building2 },
  ];

  // Chart: Pounds diverted by month
  const poundsData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthlyPounds = MONTHS.map((m) => ({ month: m, pounds: 0 }));
    listings.filter((l) => l.listing_type === "donation" && ["completed", "claimed", "picked_up", "pending_impact_report"].includes(l.status)).forEach((l) => {
      const d = new Date(l.created_at);
      if (d.getFullYear() === year) monthlyPounds[d.getMonth()].pounds += l.pounds || 0;
    });
    return monthlyPounds;
  }, [listings]);

  const totalPounds = poundsData.reduce((s, d) => s + d.pounds, 0);

  // Chart: Donations count by month
  const donationsCountData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthly = MONTHS.map((m) => ({ month: m, count: 0 }));
    listings.filter((l) => l.listing_type === "donation").forEach((l) => {
      const d = new Date(l.created_at);
      if (d.getFullYear() === year) monthly[d.getMonth()].count += 1;
    });
    return monthly;
  }, [listings]);

  const totalDonationCount = donationsCountData.reduce((s, d) => s + d.count, 0);

  // Chart: Food type breakdown
  const foodTypes = useMemo(() => {
    const map: Record<string, number> = {};
    listings.filter((l) => l.listing_type === "donation" && l.food_type).forEach((l) => {
      map[l.food_type!] = (map[l.food_type!] || 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([type, count]) => ({
      name: FOOD_TYPE_LABELS[type] || type,
      value: Math.round((count / total) * 100),
      color: FOOD_TYPE_COLORS[type] || BRAND_CREAM,
    }));
  }, [listings]);

  // Recent Donations (P3)
  const recentDonations = useMemo(() => {
    return listings
      .filter((l) => l.listing_type === "donation")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [listings]);

  // Top Nonprofits by lbs in last 30 days (P3)
  const topNonprofits = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentListings = listings.filter(
      (l) => l.listing_type === "donation" && l.nonprofit_claimed_id && new Date(l.created_at) >= thirtyDaysAgo
    );
    const npMap: Record<string, { pounds: number; count: number }> = {};
    recentListings.forEach((l) => {
      const id = l.nonprofit_claimed_id!;
      if (!npMap[id]) npMap[id] = { pounds: 0, count: 0 };
      npMap[id].pounds += l.pounds || 0;
      npMap[id].count += 1;
    });
    return Object.entries(npMap)
      .sort((a, b) => b[1].pounds - a[1].pounds)
      .slice(0, 5)
      .map(([id, data], i) => {
        const np = nonprofits.find((n) => n.id === id);
        return { rank: i + 1, name: np?.organization_name || "Unknown", ...data };
      });
  }, [listings, nonprofits]);

  const formatFoodType = (t: string | null) => FOOD_TYPE_LABELS[t || ""] || t || "—";
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Platform-wide overview of food diversion impact
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">{stat.title}</p>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-1">Pounds of Food Diverted</p>
          <p className="text-2xl font-bold text-foreground mb-6">{totalPounds.toLocaleString()} lbs</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={poundsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v.toString()} />
              <Tooltip content={<PoundsTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="pounds" fill={BRAND_BROWN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-1">Donations Over Time</p>
          <p className="text-2xl font-bold text-foreground mb-6">{totalDonationCount} total</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={donationsCountData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip content={<DonationsTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" fill={BRAND_BROWN_LIGHT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Food Type Breakdown */}
      {foodTypes.length > 0 && (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <p className="text-sm font-medium text-foreground mb-4">Food Type Breakdown</p>
          <div className="flex items-center gap-12">
            <div className="w-52 h-52 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={foodTypes} innerRadius={60} outerRadius={85} dataKey="value" stroke="none">
                    {foodTypes.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-foreground">{totalDonationCount}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-3">
              {foodTypes.map((type) => (
                <div key={type.name} className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: type.color }} />
                  <span className="text-sm text-foreground">{type.name}</span>
                  <span className="text-sm font-semibold text-foreground ml-auto">{type.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Donations (P3) */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-4">Recent Donations</p>
        {recentDonations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No donations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Organization</TableHead>
                <TableHead className="text-foreground">Food Type</TableHead>
                <TableHead className="text-foreground">Weight</TableHead>
                <TableHead className="text-foreground">Pickup Start</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDonations.map((d) => (
                <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/food-listings/donations/${d.id}`)}>
                  <TableCell className="text-foreground">{orgMap[d.organization_id]?.name || "—"}</TableCell>
                  <TableCell className="text-foreground">{formatFoodType(d.food_type)}</TableCell>
                  <TableCell className="text-foreground">{d.pounds ? `${d.pounds} lbs` : "—"}</TableCell>
                  <TableCell className="text-foreground">{d.pickup_window_start ? new Date(d.pickup_window_start).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CHIP[d.status] || "bg-gray-100 text-gray-800"}`}>
                      {formatStatus(d.status)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Top Nonprofits (P3) */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <p className="text-sm font-medium text-foreground mb-4">Top Nonprofits (Last 30 Days)</p>
        {topNonprofits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nonprofit activity in the last 30 days.</p>
        ) : (
          <div className="space-y-3">
            {topNonprofits.map((np) => (
              <div key={np.rank} className="flex items-center gap-4 p-3 rounded-lg" style={{ backgroundColor: BRAND_CREAM_LIGHT }}>
                <span className="text-lg font-bold text-foreground w-8">#{np.rank}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{np.name}</p>
                  <p className="text-xs text-muted-foreground">{np.count} donations</p>
                </div>
                <p className="text-sm font-bold text-foreground">{np.pounds.toLocaleString()} lbs</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
