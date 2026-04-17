import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceArea,
} from "recharts";
import {
  TrendingUp,
  Trash2,
  Sprout,
  Bug,
  DollarSign,
  Thermometer,
  Droplets,
  MapPin,
} from "lucide-react";
import harietLogo from "@/assets/hariet-ai-logo.png";

const PRIMARY = "#0F4C3A"; // dark green
const PRIMARY_SOFT = "#E8F1ED";
const ACCENT = "#D4A017"; // amber/gold
const TEXT = "#0F1F1A";
const MUTED = "#6B7C75";
const BORDER = "#E2E8E4";

const weeklyData = Array.from({ length: 52 }, (_, i) => {
  const week = i + 1;
  // Steady upward trend with mild seasonal variation
  const base = 1600 + i * 95;
  const seasonal = Math.sin((i / 52) * Math.PI * 2) * 180;
  const noise = ((i * 37) % 11) * 18 - 90;
  const lbs = Math.max(1200, Math.round(base + seasonal + noise));
  let sem: "Fall" | "Spring" | "Summer";
  if (week <= 17) sem = "Fall";
  else if (week <= 34) sem = "Spring";
  else sem = "Summer";
  return { week: `W${week}`, lbs, sem };
});

const activity = [
  { loc: "Dining Hall A", lbs: 142, time: "10:42 AM" },
  { loc: "Student Union", lbs: 98, time: "9:15 AM" },
  { loc: "Science Building", lbs: 67, time: "8:48 AM" },
  { loc: "Library Cafe", lbs: 53, time: "8:12 AM" },
  { loc: "Athletics Center", lbs: 121, time: "7:30 AM" },
];

const splitData = [
  { name: "Frass", value: 6240 },
  { name: "Larvae Protein", value: 2180 },
];

function Gauge({ value, max, label, unit, icon: Icon, color }: { value: number; max: number; label: string; unit: string; icon: any; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const angle = (pct / 100) * 180;
  const radius = 70;
  const cx = 90;
  const cy = 90;
  const startX = cx - radius;
  const endX = cx + radius * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const endY = cy - radius * Math.sin(Math.PI - (angle * Math.PI) / 180);
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="110" viewBox="0 0 180 110">
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={BORDER}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-6 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium" style={{ color: MUTED }}>
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className="mt-1 text-3xl font-bold tabular-nums" style={{ color: TEXT }}>
          {value}
          <span className="text-lg font-semibold ml-0.5" style={{ color: MUTED }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit, trend, accent }: { icon: any; label: string; value: string; unit?: string; trend?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl p-6 transition-shadow hover:shadow-md"
      style={{
        background: accent ? PRIMARY : "#FFFFFF",
        border: `1px solid ${accent ? PRIMARY : BORDER}`,
        boxShadow: "0 1px 2px rgba(15,76,58,0.04), 0 4px 12px rgba(15,76,58,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: accent ? "rgba(212,160,23,0.18)" : PRIMARY_SOFT,
            color: accent ? ACCENT : PRIMARY,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
            style={{
              background: accent ? "rgba(212,160,23,0.18)" : "rgba(15,76,58,0.08)",
              color: accent ? ACCENT : PRIMARY,
            }}
          >
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <div className="mt-5 text-sm font-medium" style={{ color: accent ? "rgba(255,255,255,0.7)" : MUTED }}>
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tabular-nums tracking-tight" style={{ color: accent ? "#FFFFFF" : TEXT }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm font-semibold" style={{ color: accent ? "rgba(255,255,255,0.6)" : MUTED }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FIUDashboard() {
  // Live-feel: tiny temp/humidity flicker
  const [temp, setTemp] = useState(85);
  const [humidity, setHumidity] = useState(65);
  useEffect(() => {
    const id = setInterval(() => {
      setTemp(84 + Math.round(Math.random() * 2));
      setHumidity(64 + Math.round(Math.random() * 3));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const totalSplit = splitData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="min-h-screen" style={{ background: "#F6F8F7", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-8 h-16 bg-white"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold"
            style={{ background: PRIMARY }}
          >
            H
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: PRIMARY }}>
            Hariet<span style={{ color: ACCENT }}>.AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: MUTED }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#22C55E", boxShadow: "0 0 0 4px rgba(34,197,94,0.18)" }} />
            Live
          </div>
          <div
            className="px-3 py-1.5 rounded-md text-sm font-bold tracking-wide"
            style={{ background: PRIMARY, color: "#FFFFFF" }}
          >
            FIU
          </div>
        </div>
      </header>

      <main className="px-8 py-8 max-w-[1480px] mx-auto">
        {/* Title */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: TEXT }}>
              Composting Operations
            </h1>
            <p className="text-sm mt-1" style={{ color: MUTED }}>
              Real-time sustainability metrics
            </p>
          </div>
          <div className="text-xs" style={{ color: MUTED }}>
            Updated just now
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-5">
          <StatCard icon={Trash2} label="Organic Waste Collected" value="14,820" unit="lbs" trend="+18.4%" accent />
          <StatCard icon={Sprout} label="Organic Fertilizer Produced" value="6,240" unit="lbs" trend="+12.1%" />
          <StatCard icon={Bug} label="Larvae Protein Produced" value="2,180" unit="lbs" trend="+9.6%" />
          <StatCard icon={DollarSign} label="Revenue Generated" value="$18,420" trend="+22.3%" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-5 mt-5">
          {/* Line chart */}
          <div
            className="col-span-8 rounded-2xl p-6 bg-white"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: TEXT }}>
                  Weekly Collection Volume
                </h2>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  52-week trend across Fall, Spring, and Summer semesters
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PRIMARY }} />
                  Pounds collected
                </span>
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 20, right: 12, left: 0, bottom: 24 }}>
                  <defs>
                    <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                    formatter={(v: number) => [`${v.toLocaleString()} lbs`, "Collected"]}
                  />
                  <ReferenceArea x1="W1" x2="W17" fill={PRIMARY} fillOpacity={0.04} label={{ value: "Fall", position: "insideTop", fontSize: 11, fill: MUTED, dy: 6 }} />
                  <ReferenceArea x1="W18" x2="W34" fill={ACCENT} fillOpacity={0.05} label={{ value: "Spring", position: "insideTop", fontSize: 11, fill: MUTED, dy: 6 }} />
                  <ReferenceArea x1="W35" x2="W52" fill={PRIMARY} fillOpacity={0.04} label={{ value: "Summer", position: "insideTop", fontSize: 11, fill: MUTED, dy: 6 }} />
                  <Line
                    type="monotone"
                    dataKey="lbs"
                    stroke={PRIMARY}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: ACCENT, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity feed */}
          <div
            className="col-span-4 rounded-2xl p-6 bg-white"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: TEXT }}>
                Recent Activity
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: PRIMARY_SOFT, color: PRIMARY }}>
                Last 5
              </span>
            </div>
            <ul className="space-y-3">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[#F6F8F7] transition-colors">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: PRIMARY_SOFT, color: PRIMARY }}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: TEXT }}>
                      {a.loc}
                    </div>
                    <div className="text-xs" style={{ color: MUTED }}>
                      {a.time}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums" style={{ color: PRIMARY }}>
                    {a.lbs} <span className="text-xs font-semibold" style={{ color: MUTED }}>lbs</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Environment monitor */}
          <div
            className="col-span-5 rounded-2xl p-6 bg-white"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-semibold" style={{ color: TEXT }}>
                  Container Environment
                </h2>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                  Live readings from in-vessel sensors
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#22C55E" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Live
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Gauge value={temp} max={120} label="Temperature" unit="°F" icon={Thermometer} color={ACCENT} />
              <Gauge value={humidity} max={100} label="Humidity" unit="%" icon={Droplets} color={PRIMARY} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-center text-xs" style={{ color: MUTED }}>
                Optimal range: 80–100°F
              </div>
              <div className="text-center text-xs" style={{ color: MUTED }}>
                Optimal range: 55–75%
              </div>
            </div>
          </div>

          {/* Donut */}
          <div
            className="col-span-4 rounded-2xl p-6 bg-white"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: TEXT }}>
              Output Composition
            </h2>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              Frass vs larvae protein, this month
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div style={{ width: 160, height: 160 }} className="relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={splitData}
                      dataKey="value"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      stroke="none"
                    >
                      <Cell fill={PRIMARY} />
                      <Cell fill={ACCENT} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xl font-bold tabular-nums" style={{ color: TEXT }}>
                    {(totalSplit / 1000).toFixed(1)}k
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: MUTED }}>
                    TOTAL LBS
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {splitData.map((d, i) => {
                  const pct = Math.round((d.value / totalSplit) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs font-medium" style={{ color: TEXT }}>
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i === 0 ? PRIMARY : ACCENT }} />
                          {d.name}
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: TEXT }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="text-xs tabular-nums mt-0.5" style={{ color: MUTED }}>
                        {d.value.toLocaleString()} lbs
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Small footer bar */}
          <div
            className="col-span-3 rounded-2xl p-6 flex flex-col justify-between"
            style={{ background: PRIMARY, color: "#FFFFFF" }}
          >
            <div>
              <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                Diversion Rate
              </div>
              <div className="text-4xl font-bold tabular-nums mt-1">94.2%</div>
            </div>
            <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              of organic waste diverted from landfill across all FIU collection points this month.
            </div>
            <div
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full self-start"
              style={{ background: "rgba(212,160,23,0.22)", color: ACCENT }}
            >
              <TrendingUp className="w-3 h-3" /> +3.1 pts MoM
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
