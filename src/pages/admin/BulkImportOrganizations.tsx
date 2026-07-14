import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, XCircle, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ImportRow = Record<string, string>;
type ImportResult = { row: number; organization_name: string; status: "created" | "failed"; id?: string; join_code?: string; reason?: string };

const REQUIRED = ["organization_name", "organization_type"];
const OPTIONAL = ["address", "city", "state", "zip_code", "contact_name", "contact_email", "contact_phone", "ein", "parent_organization_id", "logo_url", "business_bio", "website_url", "marketplace_enabled", "stripe_account_id", "is_verified"];

function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: ImportRow = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

export default function BulkImportOrganizations() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setResults(null);
    const text = await f.text();
    const parsed = parseCSV(text);
    setRows(parsed);
  };

  const runImport = async () => {
    if (!rows.length) return;
    setProcessing(true);
    setResults(null);
    // Two-pass: parents first (no parent_organization_id), then children
    const parents = rows.filter((r) => !r.parent_organization_id);
    const children = rows.filter((r) => r.parent_organization_id);
    let all: ImportResult[] = [];
    for (const batch of [parents, children]) {
      if (!batch.length) continue;
      const { data, error } = await supabase.functions.invoke("bulk-import-organizations", { body: { rows: batch } });
      if (error) { toast({ title: "Import error", description: error.message, variant: "destructive" }); break; }
      all = all.concat(data?.results ?? []);
    }
    setResults(all);
    setProcessing(false);
    const created = all.filter((r) => r.status === "created").length;
    toast({ title: "Import complete", description: `${created} of ${all.length} rows created.` });
  };

  const downloadTemplate = () => {
    const csv = [REQUIRED.concat(OPTIONAL).join(","), "Example Org,restaurant,123 Main St,Austin,TX,78701,Jane Doe,jane@example.com,(512) 555-0100,,,https://example.com/logo.png,Short bio here,https://example.com,false,,false"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "organizations_template.csv";
    a.click();
  };

  const downloadResults = () => {
    if (!results) return;
    const header = ["row", "organization_name", "status", "join_code", "reason"];
    const csv = [header.join(","), ...results.map((r) => header.map((k) => `"${String((r as any)[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `import_results_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import Organizations</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a CSV. Accounts are created silently with a canned temporary password. No emails are sent — use Send Invites afterward.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upload CSV</CardTitle>
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Template</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{file ? file.name : "Click to choose or drop a CSV file"}</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>

          {rows.length > 0 && (
            <div className="text-sm">
              <p><strong>{rows.length}</strong> rows detected. Nonprofits get password <code>HarietGive2026!</code>. Other org types get <code>HarietVenue2026!</code>.</p>
              <Button className="mt-3" onClick={runImport} disabled={processing}>
                {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</> : `Import ${rows.length} rows`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Results</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadResults}><Download className="w-4 h-4 mr-2" />Download CSV</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-muted rounded p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{results.length}</p></div>
              <div className="bg-green-50 rounded p-3"><p className="text-xs text-green-700">Created</p><p className="text-2xl font-bold text-green-700">{results.filter((r) => r.status === "created").length}</p></div>
              <div className="bg-red-50 rounded p-3"><p className="text-xs text-red-700">Failed</p><p className="text-2xl font-bold text-red-700">{results.filter((r) => r.status === "failed").length}</p></div>
            </div>
            <div className="max-h-96 overflow-auto text-sm">
              {results.map((r) => (
                <div key={r.row} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                  {r.status === "created" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                  <span className="w-8 text-muted-foreground">#{r.row}</span>
                  <span className="flex-1 font-medium">{r.organization_name}</span>
                  {r.join_code && <code className="text-xs bg-muted px-2 py-0.5 rounded">{r.join_code}</code>}
                  {r.reason && <span className="text-xs text-red-600">{r.reason}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
