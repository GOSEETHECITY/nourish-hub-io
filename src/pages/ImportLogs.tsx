import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ImportLogStatus = "success" | "skipped" | "pending_image_retry" | "error";

interface ImportLog {
  id: string;
  batch_id: string;
  event_name: string;
  status: ImportLogStatus;
  error_message: string | null;
  csv_filename: string;
  processed_at: string;
  created_event_id: string | null;
}

const statusColors: Record<ImportLogStatus, string> = {
  success: "bg-green-100 text-green-800",
  skipped: "bg-amber-100 text-amber-800",
  pending_image_retry: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
};

export default function ImportLogs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [retrying, setRetrying] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["import-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_logs")
        .select("*")
        .order("processed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as ImportLog[];
    },
  });

  const filtered = useMemo(() => {
    let list = [...logs];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        l.event_name.toLowerCase().includes(q) ||
        l.csv_filename.toLowerCase().includes(q) ||
        l.batch_id.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    return list;
  }, [logs, search, statusFilter]);

  // Group by batch for summary
  const batches = useMemo(() => {
    const map = new Map<string, { batch_id: string; filename: string; total: number; success: number; skipped: number; pending: number; errors: number; processed_at: string }>();
    for (const log of logs) {
      if (!map.has(log.batch_id)) {
        map.set(log.batch_id, { batch_id: log.batch_id, filename: log.csv_filename, total: 0, success: 0, skipped: 0, pending: 0, errors: 0, processed_at: log.processed_at });
      }
      const b = map.get(log.batch_id)!;
      b.total++;
      if (log.status === "success") b.success++;
      else if (log.status === "skipped") b.skipped++;
      else if (log.status === "pending_image_retry") b.pending++;
      else b.errors++;
    }
    return Array.from(map.values()).sort((a, b) => b.processed_at.localeCompare(a.processed_at));
  }, [logs]);

  const handleRetryPending = async () => {
    setRetrying(true);
    try {
      const { error } = await supabase.functions.invoke("process-grand-openings", {
        body: {},
        headers: {},
      });
      // Call with retry_pending query param
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-grand-openings?retry_pending=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: "{}",
        }
      );
      if (!resp.ok) throw new Error("Retry failed");
      toast.success("Pending image retries processed");
      refetch();
    } catch (err: any) {
      toast.error("Retry failed: " + err.message);
    }
    setRetrying(false);
  };

  const handleRunImport = async () => {
    setRetrying(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-grand-openings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: "{}",
        }
      );
      if (!resp.ok) throw new Error("Import failed");
      const data = await resp.json();
      toast.success(`Import complete: ${data.successful || 0} events created`);
      refetch();
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    }
    setRetrying(false);
  };

  const pendingCount = logs.filter((l) => l.status === "pending_image_retry").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Grand opening CSV import history and batch results</p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button variant="outline" onClick={handleRetryPending} disabled={retrying}>
              <RefreshCw className={`w-4 h-4 mr-2 ${retrying ? "animate-spin" : ""}`} />
              Retry Pending ({pendingCount})
            </Button>
          )}
          <Button onClick={handleRunImport} disabled={retrying}>
            <FileText className="w-4 h-4 mr-2" />
            Run Import Now
          </Button>
        </div>
      </div>

      {/* Batch Summaries */}
      {batches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.slice(0, 6).map((b) => (
            <div key={b.batch_id} className="bg-card rounded-xl border p-4 space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium truncate">{b.filename}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.processed_at).toLocaleDateString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">Batch: {b.batch_id}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="bg-green-50 text-green-700">{b.success} ✓</Badge>
                {b.skipped > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700">{b.skipped} skipped</Badge>}
                {b.pending > 0 && <Badge variant="outline" className="bg-blue-50 text-blue-700">{b.pending} pending</Badge>}
                {b.errors > 0 && <Badge variant="outline" className="bg-red-50 text-red-700">{b.errors} errors</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search events, files, batches..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
              <SelectItem value="pending_image_retry">Pending Retry</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead>CSV File</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Processed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                {logs.length === 0 ? "No import logs yet. Upload a CSV to grand-openings/incoming/ and run an import." : "No matching logs found"}
              </TableCell></TableRow>
            ) : filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.event_name}</TableCell>
                <TableCell className="text-sm">{log.csv_filename}</TableCell>
                <TableCell className="text-xs font-mono">{log.batch_id}</TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.status]}`}>
                    {log.status === "pending_image_retry" ? "Pending Retry" : log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.error_message || "—"}</TableCell>
                <TableCell className="text-sm">{new Date(log.processed_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
