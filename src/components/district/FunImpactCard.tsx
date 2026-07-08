import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw, Trophy } from "lucide-react";
import { funImpactStats } from "@/lib/districtMockData";

export default function FunImpactCard() {
  const [i, setI] = useState(0);
  const stat = funImpactStats[i];
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--district-success) / 0.15)" }}>
            <Trophy className="w-5 h-5" style={{ color: "hsl(var(--district-success))" }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fun Impact Stat</p>
        </div>
        <button
          onClick={() => setI((n) => (n + 1) % funImpactStats.length)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Cycle stat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <p className="mt-4 text-lg font-semibold leading-snug text-foreground">{stat.text}</p>
    </Card>
  );
}
