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

const PRIMARY = "#0F4C3A";
const PRIMARY_SOFT = "#E8F1ED";
const ACCENT = "#D4A017";
const TEXT = "#0F1F1A";
const MUTED = "#6B7C75";
const BORDER = "#E2E8E4";

const weeklyData = Array.from({ length: 52 }, (_, i) => {
  const week = i + 1;
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
  const radius = 52;
  const cx = 68;
  const cy = 68;
  const startX = cx - radius;
  const endX = cx + radius * Math.cos(Math.PI - (angle * Math.PI) / 180);
  const endY = cy - radius * Math.sin(Math.PI - (angle * Math.PI) / 180);
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="136" height="80" viewBox="0 0 136 80">
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={BORDER}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-4 text-center">
        <div className="flex items-center justify-center gap-1 text-[10px] font-medium" style={{ color: MUTED }}>
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <div className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: TEXT }}>
          {value}
          <span className="text-xs font-semibold ml-0.5" style={{ color: MUTED }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit, trend, accent }: { icon: any; label: string; value: string; unit?: string; trend?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: accent ? PRIMARY : "#FFFFFF",
        border: `1px solid ${accent ? PRIMARY : BORDER}`,
        boxShadow: "0 1px 2px rgba(15,76,58,0.04), 0 4px 12px rgba(15,76,58,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: accent ? "rgba(212,160,23,0.18)" : PRIMARY_SOFT,
            color: accent ? ACCENT : PRIMARY,
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              background: accent ? "rgba(212,160,23,0.18)" : "rgba(15,76,58,0.08)",
              color: accent ? ACCENT : PRIMARY,
            }}
          >
            <TrendingUp className="w-2.5 h-2.5" />
            {trend}
          </div>
        )}
      </div>
      <div className="mt-3 text-[11px] font-medium" style={{ color: accent ? "rgba(255,255,255,0.7)" : MUTED }}>
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: accent ? "#FFFFFF" : TEXT }}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold" style={{ color: accent ? "rgba(255,255,255,0.6)" : MUTED }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FIUDashboard() {
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
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: "#F6F8F7", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6 h-12 bg-white shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <img src={harietLogo} alt="Hariet.AI" className="h-9 w-auto" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: MUTED }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E", boxShadow: "0 0 0 3px rgba(34,197,94,0.18)" }} />
            Live
          </div>
          <div
            className="px-2.5 py-1 rounded text-xs font-bold tracking-wide"
            style={{ background: PRIMARY, color: "#FFFFFF" }}
          >
            FIU
          </div>
        </div>
      </header>

      <main className="px-6 py-4 flex-1 flex flex-col gap-3 max-w-[1480px] w-full mx-auto overflow-hidden">
        {/* Title */}
        <div className="flex items-end justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight" style={{ color: TEXT }}>
              Composting Operations
            </h1>
            <p className="text-[11px]" style={{ color: MUTED }}>
              Real-time sustainability metrics
            </p>
          </div>
          <div className="text-[10px]" style={{ color: MUTED }}>
            Updated just now
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          <StatCard icon={Trash2} label="Organic Waste Collected" value="14,820" unit="lbs" trend="+18.4%" accent />
          <StatCard icon={Sprout} label="Organic Fertilizer Produced" value="6,240" unit="lbs" trend="+12.1%" />
          <StatCard icon={Bug} label="Larvae Protein Produced" value="2,180" unit="lbs" trend="+9.6%" />
          <StatCard icon={DollarSign} label="Revenue Generated" value="$18,420" trend="+22.3%" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-12 grid-rows-2 gap-3 flex-1 min-h-0">
          {/* Line chart */}
          <div
            className="col-span-8 row-span-1 rounded-xl p-4 bg-white flex flex-col min-h-0"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div>
                <h2 className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>
                  Weekly Collection Volume
                </h2>
                <p className="text-[10px]" style={{ color: MUTED }}>
                  52-week trend across Fall, Spring, and Summer semesters
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: MUTED }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: PRIMARY }} />
                  Pounds collected
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 12, right: 8, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      fontSize: 11,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                    formatter={(v: number) => [`${v.toLocaleString()} lbs`, "Collected"]}
                  />
                  <ReferenceArea x1="W1" x2="W17" fill={PRIMARY} fillOpacity={0.04} label={{ value: "Fall", position: "insideTop", fontSize: 10, fill: MUTED, dy: 4 }} />
                  <ReferenceArea x1="W18" x2="W34" fill={ACCENT} fillOpacity={0.05} label={{ value: "Spring", position: "insideTop", fontSize: 10, fill: MUTED, dy: 4 }} />
                  <ReferenceArea x1="W35" x2="W52" fill={PRIMARY} fillOpacity={0.04} label={{ value: "Summer", position: "insideTop", fontSize: 10, fill: MUTED, dy: 4 }} />
                  <Line
                    type="monotone"
                    dataKey="lbs"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: ACCENT, stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity feed */}
          <div
            className="col-span-4 row-span-1 rounded-xl p-4 bg-white flex flex-col min-h-0"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-sm font-semibold" style={{ color: TEXT }}>
                Recent Activity
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: PRIMARY_SOFT, color: PRIMARY }}>
                Last 5
              </span>
            </div>
            <ul className="space-y-1 flex-1 min-h-0 overflow-hidden">
              {activity.map((a, i) => (
                <li key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: PRIMARY_SOFT, color: PRIMARY }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: TEXT }}>
                      {a.loc}
                    </div>
                    <div className="text-[10px]" style={{ color: MUTED }}>
                      {a.time}
                    </div>
                  </div>
                  <div className="text-xs font-bold tabular-nums" style={{ color: PRIMARY }}>
                    {a.lbs} <span className="text-[10px] font-semibold" style={{ color: MUTED }}>lbs</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Environment monitor */}
          <div
            className="col-span-5 row-span-1 rounded-xl p-4 bg-white flex flex-col min-h-0"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>
                  Container Environment
                </h2>
                <p className="text-[10px]" style={{ color: MUTED }}>
                  Live readings from in-vessel sensors
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#22C55E" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Live
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 flex-1 items-center">
              <Gauge value={temp} max={120} label="Temperature" unit="°F" icon={Thermometer} color={ACCENT} />
              <Gauge value={humidity} max={100} label="Humidity" unit="%" icon={Droplets} color={PRIMARY} />
            </div>
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="text-center text-[10px]" style={{ color: MUTED }}>
                Optimal: 80–100°F
              </div>
              <div className="text-center text-[10px]" style={{ color: MUTED }}>
                Optimal: 55–75%
              </div>
            </div>
          </div>

          {/* Donut */}
          <div
            className="col-span-4 row-span-1 rounded-xl p-4 bg-white flex flex-col min-h-0"
            style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(15,76,58,0.04)" }}
          >
            <h2 className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>
              Output Composition
            </h2>
            <p className="text-[10px]" style={{ color: MUTED }}>
              Frass vs larvae protein, this month
            </p>
            <div className="flex items-center gap-3 flex-1 min-h-0 mt-1">
              <div style={{ width: 110, height: 110 }} className="relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={splitData}
                      dataKey="value"
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={3}
                      stroke="none"
                    >
                      <Cell fill={PRIMARY} />
                      <Cell fill={ACCENT} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-base font-bold tabular-nums" style={{ color: TEXT }}>
                    {(totalSplit / 1000).toFixed(1)}k
                  </div>
                  <div className="text-[9px] font-medium" style={{ color: MUTED }}>
                    TOTAL LBS
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {splitData.map((d, i) => {
                  const pct = Math.round((d.value / totalSplit) * 100);
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: TEXT }}>
                          <span className="w-2 h-2 rounded-sm" style={{ background: i === 0 ? PRIMARY : ACCENT }} />
                          {d.name}
                        </span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: TEXT }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="text-[10px] tabular-nums" style={{ color: MUTED }}>
                        {d.value.toLocaleString()} lbs
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Diversion rate */}
          <div
            className="col-span-3 row-span-1 rounded-xl p-4 flex flex-col justify-between min-h-0"
            style={{ background: PRIMARY, color: "#FFFFFF" }}
          >
            <div>
              <div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                Diversion Rate
              </div>
              <div className="text-3xl font-bold tabular-nums mt-0.5">94.2%</div>
            </div>
            <div className="text-[10px] leading-snug" style={{ color: "rgba(255,255,255,0.7)" }}>
              of organic waste diverted from landfill across all FIU collection points this month.
            </div>
            <div
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
              style={{ background: "rgba(212,160,23,0.22)", color: ACCENT }}
            >
              <TrendingUp className="w-2.5 h-2.5" /> +3.1 pts MoM
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
