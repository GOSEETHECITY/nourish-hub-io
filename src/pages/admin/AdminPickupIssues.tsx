import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { ISSUE_LABELS } from "@/components/nonprofit/ReportProblemDialog";

const db = supabase as any;

export default function AdminPickupIssues() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState("open");

  const { data: issues = [] } = useQuery({
    queryKey: ["admin-pickup-issues"],
    queryFn: async () => (await db.from("pickup_issues").select("*").order("created_at", { ascending: false }).limit(500)).data || [],
  });
  const npIds = useMemo(() => [...new Set(issues.map((i: any) => i.nonprofit_id).filter(Boolean))], [issues]);
  const { data: nps = [] } = useQuery({
    queryKey: ["admin-issue-nps", npIds],
    queryFn: async () => (await supabase.from("nonprofits").select("id, organization_name").in("id", npIds as string[])).data || [],
    enabled: npIds.length > 0,
  });
  const npName = Object.fromEntries((nps as any[]).map((n) => [n.id, n.organization_name]));
  const shown = issues.filter((i: any) => filter === "all" || i.status === filter);
  const openCount = issues.filter((i: any) => i.status === "open").length;

  const resolve = async (id: string) => {
    const { error } = await db.from("pickup_issues").update({ status: "resolved", resolved_by: user?.id, resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-pickup-issues"] });
    toast.success("Marked resolved");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pickup Problems</h1>
        <p className="text-sm text-muted-foreground mt-1">Problems reported by nonprofits and pickups automatically flagged after their window passed without confirmation.</p>
      </div>
      {openCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4" /> {openCount} open pickup {openCount === 1 ? "problem needs" : "problems need"} attention.
        </div>
      )}
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
      <div className="bg-card rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Reported</TableHead><TableHead>Nonprofit</TableHead><TableHead>Problem</TableHead><TableHead>Source</TableHead>
            <TableHead>Details</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No pickup problems.</TableCell></TableRow>
            ) : shown.map((i: any) => (
              <TableRow key={i.id}>
                <TableCell>{new Date(i.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</TableCell>
                <TableCell className="font-medium">{npName[i.nonprofit_id] || "—"}</TableCell>
                <TableCell>{ISSUE_LABELS[i.issue_type] || i.issue_type}</TableCell>
                <TableCell>{i.source === "system" ? "Auto-flagged" : "Nonprofit"}</TableCell>
                <TableCell className="max-w-[320px] text-sm">{i.description || "—"}</TableCell>
                <TableCell className="capitalize">{i.status}</TableCell>
                <TableCell className="text-right">{i.status === "open" && <Button size="sm" onClick={() => resolve(i.id)}>Mark resolved</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
