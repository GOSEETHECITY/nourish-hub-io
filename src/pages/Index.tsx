import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Utensils, Package, Heart, Building2, ArrowUpRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type { FoodListing, ImpactReport, Organization, Nonprofit } from "@/types/database";

/* ── Custom Tooltips ── */
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
  prepared_meals: "hsl(var(--chart-5))",
  produce: "hsl(var(--chart-2))",
  dairy: "hsl(var(--chart-1))",
  meat_protein: "hsl(var(--chart-4))",
  baked_goods: "hsl(var(--chart-3))",
  shelf_stable: "hsl(199, 60%, 65%)",
  frozen: "hsl(220, 14%, 60%)",
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

export default function Dashboard() {
  // Fetch real data
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
      const { data, error } = await supabase.from("organizations").select("id, approval_status");
      if (error) throw error;
      return data as Pick<Organization, "id" | "approval_status">[];
    },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["dashboard-nonprofits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("id, approval_status");
      if (error) throw error;
      return data as Pick<Nonprofit, "id" | "approval_status">[];
    },
  });

  // KPI calculations
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const activeDonations = listings.filter((l) => l.listing_type === "donation" && ["posted", "claimed", "picked_up"].includes(l.status)).length;
  const approvedNonprofits = nonprofits.filter((n) => n.approval_status === "approved").length;
  const totalOrgs = orgs.length;

  const stats = [
    { title: "Total Meals Served", value: totalMeals.toLocaleString(), sub: `${reports.length} impact reports`, icon: Utensils },
    { title: "Active Donations", value: activeDonations.toString(), sub: "Posted, Claimed & Picked Up", icon: Package },
    { title: "Total Nonprofits", value: approvedNonprofits.toString(), sub: "Approved only", icon: Heart },
    { title: "Total Organizations", value: totalOrgs.toString(), sub: "All registered", icon: Building2 },
  ];

  // Chart 1: Pounds diverted by month (current year)
  const poundsData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthlyPounds = MONTHS.map((m, i) => ({ month: m, pounds: 0 }));
    listings.filter((l) => l.listing_type === "donation" && l.status === "completed").forEach((l) => {
      const d = new Date(l.created_at);
      if (d.getFullYear() === year) monthlyPounds[d.getMonth()].pounds += l.pounds || 0;
    });
    return monthlyPounds;
  }, [listings]);

  const totalPounds = poundsData.reduce((s, d) => s + d.pounds, 0);

  // Chart 2: Donations over time (count by month)
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

  // Chart 3: Food type breakdown
  const foodTypes = useMemo(() => {
    const map: Record<string, number> = {};
    listings.filter((l) => l.listing_type === "donation" && l.food_type).forEach((l) => {
      map[l.food_type!] = (map[l.food_type!] || 0) + 1;
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([type, count]) => ({
      name: FOOD_TYPE_LABELS[type] || type,
      value: Math.round((count / total) * 100),
      color: FOOD_TYPE_COLORS[type] || "hsl(220, 14%, 60%)",
    }));
  }, [listings]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Platform-wide overview of food diversion impact
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium font-serif text-chart-5">{stat.title}</p>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
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
        {/* Chart 1 — Pounds Diverted */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium font-serif text-sidebar-primary">Pounds of Food Diverted</p>
          </div>
          <p className="text-2xl font-bold text-foreground mb-6">{totalPounds.toLocaleString()} lbs</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={poundsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v.toString()} />
              <Tooltip content={<PoundsTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="pounds" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 — Donations Over Time */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Donations Over Time</p>
          </div>
          <p className="text-2xl font-bold text-foreground mb-6">{totalDonationCount} total</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={donationsCountData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip content={<DonationsTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3 — Food Type Breakdown */}
      {foodTypes.length > 0 && (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-4">Food Type Breakdown</p>
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
                  <span className="text-sm text-muted-foreground">{type.name}</span>
                  <span className="text-sm font-semibold text-foreground ml-auto">{type.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}