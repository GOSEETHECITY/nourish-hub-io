import { useState } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { foodDivertedByRange, type ChartRange } from "@/lib/districtMockData";

const rangeLabel: Record<ChartRange, string> = {
  week: "This Week",
  month: "This Month",
  semester: "Semester",
};

export default function FoodDivertedChart() {
  const [range, setRange] = useState<ChartRange>("month");
  const data = foodDivertedByRange[range];

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card h-full">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Food Diverted Over Time</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Pounds by category, stacked</p>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          {(Object.keys(rangeLabel) as ChartRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                range === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" />
            <Bar dataKey="donated" stackId="a" fill="hsl(var(--district-primary))" name="Donated" radius={[0, 0, 0, 0]} />
            <Bar dataKey="composted" stackId="a" fill="hsl(var(--district-success))" name="Composted" />
            <Bar dataKey="couldHave" stackId="a" fill="hsl(var(--district-alert))" name="Could Have Been Donated" />
            <Bar dataKey="waste" stackId="a" fill="hsl(var(--muted-foreground))" name="Waste" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
