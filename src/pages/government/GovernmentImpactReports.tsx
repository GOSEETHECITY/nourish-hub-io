import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImpactReport } from "@/types/database";

export default function GovernmentImpactReports() {
  const { data: reports = [] } = useQuery({
    queryKey: ["gov-impact-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("impact_reports").select("*").order("created_at", { ascending: false });
      return (data || []) as ImpactReport[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Impact Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">All submitted impact reports in your region (read only)</p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Listing</TableHead><TableHead>Meals Served</TableHead><TableHead>Date Distributed</TableHead><TableHead>Notes</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No impact reports submitted yet.</TableCell></TableRow>
            ) : reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.food_listing_id.slice(0, 8)}...</TableCell>
                <TableCell className="font-medium">{r.meals_served || "—"}</TableCell>
                <TableCell>{r.date_distributed ? new Date(r.date_distributed).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.notes || "—"}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
