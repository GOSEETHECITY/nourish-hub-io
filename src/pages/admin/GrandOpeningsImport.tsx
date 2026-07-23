import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Row = Record<string, string>;
type Result = {
  row: number;
  event_name: string;
  status: "created" | "failed";
  id?: string;
  reason?: string;
};

const REQUIRED = [
  "event_name", "event_date", "start_time", "end_time",
  "address", "city", "state", "description",
  "latitude", "longitude",
];
const ALL_HEADERS = [
  ...REQUIRED, "organization_id", "zip", "food_items", "estimated_value", "event_image_url",
];

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export default function GrandOpeningsImport() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<{
    total: number; created: number; failed: number; results: Result[];
  } | null>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setSummary(null);
    try {
      const text = await f.text();
      const parsed = parseCSV(text);
      setRows(parsed);
      if (!parsed.length) toast({ title: "No rows found in CSV", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Failed to read file", description: e?.message, variant: "destructive" });
    }
  };

  const runImport = async () => {
    if (!rows.length) return;
    setProcessing(true);
    setSummary(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not signed in. Please sign in as an admin.");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-grand-openings`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `Import failed (${res.status})`);
      setSummary(data);
      toast({
        title: "Import complete",
        description: `${data.created} created, ${data.failed} failed of ${data.total}`,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grand Openings CSV Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk-publish Grand Opening events. All rows insert as <span className="font-mono">status=published</span>. No emails are sent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected columns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs font-mono flex flex-wrap gap-2">
            {ALL_HEADERS.map((h) => (
              <span
                key={h}
                className={`px-2 py-1 rounded border ${REQUIRED.includes(h) ? "bg-orange-50 border-orange-300" : "bg-muted"}`}
              >
                {h}{REQUIRED.includes(h) ? " *" : ""}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * required. <span className="font-mono">event_date</span> must be YYYY-MM-DD and in the future.{" "}
            <span className="font-mono">start_time</span> / <span className="font-mono">end_time</span> in HH:MM 24-hour.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted transition">
              <Upload className="h-4 w-4" /> Choose file
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file && <span className="text-sm text-muted-foreground">{file.name} — {rows.length} rows</span>}
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Preview (first 3 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded">
              <table className="text-xs w-full">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(rows[0]).map((h) => (
                      <th key={h} className="text-left px-2 py-1 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 3).map((r, i) => (
                    <tr key={i} className="border-t">
                      {Object.keys(rows[0]).map((h) => (
                        <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[180px] truncate">
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={runImport} disabled={!rows.length || processing}>
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</> : <>Import {rows.length} events</>}
        </Button>
        {processing && (
          <span className="text-sm text-muted-foreground">Validating and inserting rows…</span>
        )}
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-6 text-sm">
              <div><span className="font-semibold">Total:</span> {summary.total}</div>
              <div className="text-green-700"><span className="font-semibold">Created:</span> {summary.created}</div>
              <div className="text-red-700"><span className="font-semibold">Failed:</span> {summary.failed}</div>
            </div>
            <div className="border rounded divide-y max-h-[480px] overflow-y-auto">
              {summary.results.map((r, i) => (
                <div key={i} className="px-3 py-2 flex items-start gap-2 text-sm">
                  {r.status === "created"
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">Row {r.row}: {r.event_name}</div>
                    {r.reason && <div className="text-xs text-red-700">{r.reason}</div>}
                    {r.id && <div className="text-xs text-muted-foreground font-mono">{r.id}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
