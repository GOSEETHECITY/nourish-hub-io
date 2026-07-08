import { Card } from "@/components/ui/card";
import { timeTracker } from "@/lib/districtMockData";

export default function TimeTracker() {
  const items = [
    { label: "HarietAI", value: `${timeTracker.hariet} hrs` },
    { label: "School Staff", value: `${timeTracker.school} hrs` },
    { label: "District Staff", value: `${timeTracker.district} hrs` },
  ];
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card h-full">
      <h3 className="text-base font-semibold text-foreground">Program Time Tracker</h3>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.label} className="text-center p-3 rounded-lg bg-muted/40">
            <p className="text-xl font-bold text-foreground">{it.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{it.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">Tracking true per-school cost to scale to 392 schools.</p>
    </Card>
  );
}
