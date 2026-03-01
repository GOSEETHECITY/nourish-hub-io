import { Utensils, Package, Heart, Building2, ArrowUpRight, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell } from
"recharts";

/* ── KPI Data ── */
const stats = [
{ title: "Total Meals Served", value: "38,541", change: "+5.1%", sub: "+890 this week", icon: Utensils },
{ title: "Active Donations", value: "24", change: "+8.3%", sub: "Posted, Claimed & Picked Up", icon: Package },
{ title: "Total Nonprofits", value: "42", change: "+2.4%", sub: "Approved only", icon: Heart },
{ title: "Total Organizations", value: "156", change: "+1.9%", sub: "Excl. nonprofits", icon: Building2 }];


/* ── Chart 1: Pounds of Food Diverted (monthly) ── */
const poundsData = [
{ month: "Jan", pounds: 4200 },
{ month: "Feb", pounds: 5800 },
{ month: "Mar", pounds: 6100 },
{ month: "Apr", pounds: 7800 },
{ month: "May", pounds: 9200 },
{ month: "Jun", pounds: 8500 },
{ month: "Jul", pounds: 11000 },
{ month: "Aug", pounds: 13500 },
{ month: "Sep", pounds: 10200 },
{ month: "Oct", pounds: 8800 },
{ month: "Nov", pounds: 10500 },
{ month: "Dec", pounds: 11500 }];

const totalPounds = poundsData.reduce((s, d) => s + d.pounds, 0);

/* ── Chart 2: Donations Over Time (count) ── */
const donationsCountData = [
{ month: "Jan", count: 12 },
{ month: "Feb", count: 18 },
{ month: "Mar", count: 24 },
{ month: "Apr", count: 31 },
{ month: "May", count: 28 },
{ month: "Jun", count: 35 },
{ month: "Jul", count: 42 },
{ month: "Aug", count: 38 },
{ month: "Sep", count: 30 },
{ month: "Oct", count: 26 },
{ month: "Nov", count: 33 },
{ month: "Dec", count: 37 }];

const totalDonations = donationsCountData.reduce((s, d) => s + d.count, 0);

/* ── Chart 3: Food Type Breakdown (7 global types) ── */
const foodTypes = [
{ name: "Prepared Meals", value: 32, color: "hsl(var(--chart-5))" },
{ name: "Produce", value: 22, color: "hsl(var(--chart-2))" },
{ name: "Dairy", value: 10, color: "hsl(var(--chart-1))" },
{ name: "Meat / Protein", value: 9, color: "hsl(var(--chart-4))" },
{ name: "Baked Goods", value: 12, color: "hsl(var(--chart-3))" },
{ name: "Shelf-Stable", value: 8, color: "hsl(199, 60%, 65%)" },
{ name: "Frozen", value: 7, color: "hsl(220, 14%, 60%)" }];


/* ── Custom Tooltip ── */
const PoundsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-4 py-2.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">
        Pounds: <span className="font-semibold text-foreground">{payload[0].value.toLocaleString()} lbs</span>
      </p>
    </div>);

};

const DonationsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg shadow-lg px-4 py-2.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">
        Donations: <span className="font-semibold text-foreground">{payload[0].value}</span>
      </p>
    </div>);

};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm mt-1 text-zinc-950">
          Platform-wide overview of food diversion impact
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) =>
        <div key={stat.title} className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium font-serif text-chart-5">{stat.title}</p>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium text-success flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </span>
              <span className="text-xs text-muted-foreground">{stat.sub}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Chart 1 — Pounds Diverted */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium font-serif text-sidebar-primary">Pounds of Food Diverted</p>
            <button className="text-xs font-medium text-muted-foreground border rounded-full px-3 py-1 hover:bg-muted transition-colors">
              This Year
            </button>
          </div>
          <p className="text-2xl font-bold text-foreground mb-6">{totalPounds.toLocaleString()} lbs</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={poundsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip content={<PoundsTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="pounds" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 — Donations Over Time (count) */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Donations Over Time</p>
            <button className="text-xs font-medium text-muted-foreground border rounded-full px-3 py-1 hover:bg-muted transition-colors">
              This Year
            </button>
          </div>
          <p className="text-2xl font-bold text-foreground mb-6">{totalDonations} completed</p>
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

      {/* ── Chart 3 — Food Type Breakdown (Donut) ── */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground mb-4">Food Type Breakdown</p>
        <div className="flex items-center gap-12">
          <div className="w-52 h-52 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={foodTypes} innerRadius={60} outerRadius={85} dataKey="value" stroke="none">
                  {foodTypes.map((entry, i) =>
                  <Cell key={i} fill={entry.color} />
                  )}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold text-foreground">{totalDonations}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3">
            {foodTypes.map((type) =>
            <div key={type.name} className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: type.color }} />
                <span className="text-sm text-muted-foreground">{type.name}</span>
                <span className="text-sm font-semibold text-foreground ml-auto">{type.value}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>);

}