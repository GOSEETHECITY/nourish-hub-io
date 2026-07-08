import { Card } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { alerts } from "@/lib/districtMockData";

const styles = {
  red: { bg: "hsl(var(--district-alert) / 0.08)", color: "hsl(var(--district-alert))", Icon: AlertCircle },
  yellow: { bg: "hsl(38 92% 50% / 0.10)", color: "hsl(38 92% 40%)", Icon: AlertTriangle },
  blue: { bg: "hsl(var(--district-primary) / 0.08)", color: "hsl(var(--district-primary))", Icon: Info },
};

export default function NeedsAttention() {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card h-full">
      <h3 className="text-base font-semibold text-foreground mb-4">Needs Attention</h3>
      <ul className="space-y-2.5">
        {alerts.map((a, i) => {
          const s = styles[a.level];
          const Icon = s.Icon;
          return (
            <li key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: s.bg }}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: s.color }} />
              <span className="text-sm text-foreground">{a.text}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
