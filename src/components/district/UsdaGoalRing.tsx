import { Card } from "@/components/ui/card";
import { usdaGoal } from "@/lib/districtMockData";

export default function UsdaGoalRing() {
  const size = 140;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pctOfGoal = Math.min(100, (usdaGoal.progress / usdaGoal.target) * 100);
  const dash = (pctOfGoal / 100) * circ;

  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">USDA 2030 Goal</p>
      <p className="text-sm text-muted-foreground mt-1">50% food waste reduction</p>
      <div className="flex items-center gap-4 mt-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--district-primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{usdaGoal.progress}%</span>
            <span className="text-[10px] text-muted-foreground">of 50%</span>
          </div>
        </div>
        <div className="flex-1">
          <span
            className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: "hsl(var(--district-success) / 0.12)", color: "hsl(var(--district-success))" }}
          >
            {usdaGoal.label}
          </span>
          <p className="text-xs text-muted-foreground mt-2">Diversion pace matches the trajectory needed to hit the federal 2030 target.</p>
        </div>
      </div>
    </Card>
  );
}
