import { Card } from "@/components/ui/card";
import { Truck } from "lucide-react";
import { recentPickups } from "@/lib/districtMockData";

export default function RecentPickups() {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Recent Pickups</h3>
        <span className="text-xs text-muted-foreground">Live feed</span>
      </div>
      <ul className="space-y-3">
        {recentPickups.map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--district-primary) / 0.10)" }}>
              <Truck className="w-4 h-4" style={{ color: "hsl(var(--district-primary))" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.school}</p>
              <p className="text-xs text-muted-foreground truncate">
                {p.lbs} lbs → {p.nonprofit} · {p.method}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{p.when}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
