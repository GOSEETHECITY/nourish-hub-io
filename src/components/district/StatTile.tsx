import { Card } from "@/components/ui/card";

interface StatTileProps {
  label: string;
  value: string;
  delta: string;
  deltaTone?: "positive" | "negative";
}

export default function StatTile({ label, value, delta, deltaTone = "positive" }: StatTileProps) {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
      </div>
      <span
        className="inline-flex items-center mt-3 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{
          background: deltaTone === "positive" ? "hsl(var(--district-success) / 0.12)" : "hsl(var(--district-alert) / 0.12)",
          color: deltaTone === "positive" ? "hsl(var(--district-success))" : "hsl(var(--district-alert))",
        }}
      >
        {delta}
      </span>
    </Card>
  );
}
