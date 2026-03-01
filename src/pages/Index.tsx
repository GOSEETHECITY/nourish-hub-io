import { TrendingUp, Package, Utensils, Users, ArrowUpRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

const stats = [
  { title: "Total Pounds Diverted", value: "12,847", change: "+2.4%", sub: "+312 this week", icon: TrendingUp },
  { title: "Active Listings", value: "24", change: "+8.3%", sub: "+3 today", icon: Package },
  { title: "Meals Served", value: "38,541", change: "+5.1%", sub: "+890 this week", icon: Utensils },
  { title: "Partner Organizations", value: "156", change: "+1.9%", sub: "+4 this month", icon: Users },
];

const monthlyData = [
  { month: "Mar", donations: 61000 },
  { month: "Apr", donations: 78000 },
  { month: "May", donations: 92000 },
  { month: "Jun", donations: 85000 },
  { month: "Jul", donations: 110000 },
  { month: "Aug", donations: 135000 },
  { month: "Sep", donations: 98000 },
  { month: "Oct", donations: 88000 },
  { month: "Nov", donations: 105000 },
  { month: "Dec", donations: 115000 },
];

const impactData = [
  { month: "Jan", value: 5200 },
  { month: "Feb", value: 6800 },
  { month: "Mar", value: 9100 },
  { month: "Apr", value: 10500 },
];

const foodTypes = [
  { name: "Prepared", value: 42, color: "hsl(18, 44%, 30%)" },
  { name: "Produce", value: 28, color: "hsl(142, 71%, 45%)" },
  { name: "Frozen", value: 18, color: "hsl(199, 89%, 48%)" },
  { name: "Perishable", value: 12, color: "hsl(38, 92%, 50%)" },
];

const wasteData = [
  { day: "Week 1", value: 65 },
  { day: "Week 2", value: 72 },
  { day: "Week 3", value: 58 },
  { day: "Week 4", value: 80 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your food diversion impact
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-accent" />
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
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="col-span-2 bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Donations Over Time</h3>
              <p className="text-2xl font-bold text-foreground mt-1">$248,502</p>
            </div>
            <select className="text-sm border rounded-lg px-3 py-1.5 bg-background text-foreground">
              <option>This Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(30, 10%, 90%)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(25, 10%, 45%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(25, 10%, 45%)", fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]} />
              <Bar dataKey="donations" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Impact Card */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold text-foreground">Total Impact</h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-foreground">14,902</p>
            <span className="text-xs font-medium text-success flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              12.8%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1 mb-4">
            Meals served over time
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={impactData}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "hsl(25, 10%, 45%)", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(25, 10%, 45%)", fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <button className="text-sm font-medium text-foreground hover:text-accent mt-2 flex items-center gap-1">
            View Details <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Food Type Breakdown</h3>
            <button className="text-sm font-medium text-accent flex items-center gap-1">
              View Details <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-8">
            <div className="w-40 h-40 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={foodTypes} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                    {foodTypes.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-foreground">204</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
            <div className="space-y-3">
              {foodTypes.map((type) => (
                <div key={type.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: type.color }} />
                  <span className="text-sm text-muted-foreground">{type.name}</span>
                  <span className="text-sm font-semibold text-foreground ml-1">— {type.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Waste Line */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Food Waste Reduced</h3>
            <select className="text-sm border rounded-lg px-3 py-1.5 bg-background text-foreground">
              <option>Last 30 Days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={wasteData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(30, 10%, 90%)" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(25, 10%, 45%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(25, 10%, 45%)", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="value" stroke="hsl(18, 44%, 30%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
