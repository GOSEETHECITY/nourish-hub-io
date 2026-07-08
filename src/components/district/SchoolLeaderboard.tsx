import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { schoolLeaderboard } from "@/lib/districtMockData";

const statusColor: Record<string, string> = {
  green: "hsl(var(--district-success))",
  yellow: "hsl(38 92% 50%)",
  red: "hsl(var(--district-alert))",
};
const statusLabel: Record<string, string> = {
  green: "Reported today",
  yellow: "1-2 days missing",
  red: "3+ days missing",
};

export default function SchoolLeaderboard() {
  return (
    <Card className="p-5 rounded-2xl border-0 shadow-sm bg-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">School Rankings — Most Food Donated</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All 9 participating high schools</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
              <th className="text-left py-2 pr-3">Rank</th>
              <th className="text-left py-2 pr-3">School</th>
              <th className="text-right py-2 px-3">Lbs Donated</th>
              <th className="text-right py-2 px-3">Lbs Composted</th>
              <th className="text-right py-2 px-3">Diversion %</th>
              <th className="text-left py-2 px-3">Last Submission</th>
              <th className="text-left py-2 pl-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {schoolLeaderboard.map((s) => (
              <tr key={s.rank} className="border-b last:border-0 hover:bg-muted/40">
                <td className="py-3 pr-3 font-semibold text-foreground">
                  <div className="flex items-center gap-1.5">
                    {s.rank === 1 && <Trophy className="w-4 h-4" style={{ color: "hsl(45 90% 50%)" }} />}
                    #{s.rank}
                  </div>
                </td>
                <td className="py-3 pr-3 font-medium text-foreground">{s.name}</td>
                <td className="py-3 px-3 text-right tabular-nums">{s.lbsDonated.toLocaleString()}</td>
                <td className="py-3 px-3 text-right tabular-nums">{s.lbsComposted.toLocaleString()}</td>
                <td className="py-3 px-3 text-right tabular-nums font-semibold">{s.diversionRate}%</td>
                <td className="py-3 px-3 text-muted-foreground">{s.lastSubmission}</td>
                <td className="py-3 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: statusColor[s.status] }} />
                    <span className="text-xs text-muted-foreground">{statusLabel[s.status]}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
