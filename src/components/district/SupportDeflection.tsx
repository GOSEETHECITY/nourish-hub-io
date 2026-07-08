import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { supportBreakdown } from "@/lib/districtMockData";

export default function SupportDeflection() {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card h-full">
      <h3 className="text-base font-semibold text-foreground">Support Questions This Month</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-foreground">{supportBreakdown.total}</span>
        <span className="text-sm text-muted-foreground">questions answered</span>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm">
        <li className="flex justify-between"><span className="text-muted-foreground">Answered by Sort It app</span><span className="font-semibold">{supportBreakdown.sortIt}</span></li>
        <li className="flex justify-between"><span className="text-muted-foreground">Answered by HarietAI support</span><span className="font-semibold">{supportBreakdown.hariet}</span></li>
        <li className="flex justify-between"><span className="text-muted-foreground">Sent to district office</span><span className="font-semibold">{supportBreakdown.district}</span></li>
      </ul>
      <div className="mt-4 flex items-center gap-2 p-3 rounded-lg" style={{ background: "hsl(var(--district-success) / 0.12)" }}>
        <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(var(--district-success))" }} />
        <span className="text-sm font-semibold" style={{ color: "hsl(var(--district-success))" }}>Zero questions reached M-DCPS staff</span>
      </div>
    </Card>
  );
}
