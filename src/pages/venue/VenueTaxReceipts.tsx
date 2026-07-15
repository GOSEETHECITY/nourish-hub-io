import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { openReceiptPdf } from "@/lib/taxReceipts";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function VenueTaxReceipts() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [year, setYear] = useState<string>(String(currentYear));
  const [nonprofitFilter, setNonprofitFilter] = useState<string>("all");
  const [downloading, setDownloading] = useState(false);

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["venue-tax-receipts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_receipts")
        .select("id, pdf_path, receipt_type, submitted_at, nonprofit_id, food_listing_id, nonprofits(organization_name, ein), food_listings(food_type, pounds, estimated_donation_value, created_at)")
        .eq("venue_organization_id", orgId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    return (receipts || []).filter((r) => {
      const created = r.food_listings?.created_at ? new Date(r.food_listings.created_at).getFullYear() : null;
      if (year !== "all" && created !== Number(year)) return false;
      if (nonprofitFilter !== "all" && r.nonprofit_id !== nonprofitFilter) return false;
      return true;
    });
  }, [receipts, year, nonprofitFilter]);

  const nonprofitOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of receipts) {
      if (r.nonprofit_id && r.nonprofits?.organization_name) {
        map.set(r.nonprofit_id, r.nonprofits.organization_name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [receipts]);

  const totals = useMemo(() => {
    let pounds = 0, value = 0;
    for (const r of filtered) {
      pounds += Number(r.food_listings?.pounds || 0);
      value += Number(r.food_listings?.estimated_donation_value || 0);
    }
    return { count: filtered.length, pounds, value };
  }, [filtered]);

  const downloadYearEnd = async () => {
    if (!orgId) return;
    setDownloading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-year-end-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          },
          body: JSON.stringify({
            year: Number(year),
            venue_organization_id: orgId,
            nonprofit_id: nonprofitFilter === "all" ? null : nonprofitFilter,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `year-end-summary-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Year-end summary downloaded");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate summary");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tax &amp; Receipts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All tax receipts submitted for your donations. Generate a year-end summary letter for your records.
          </p>
        </div>
        <Button onClick={downloadYearEnd} disabled={downloading || !orgId}>
          <Download className="h-4 w-4 mr-2" />
          {downloading ? "Generating…" : `Year-End Summary (${year})`}
        </Button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receipts</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.count}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Weight</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totals.pounds.toFixed(1)} <span className="text-base font-normal text-muted-foreground">lbs</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total FMV</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">${totals.value.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={nonprofitFilter} onValueChange={setNonprofitFilter}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All nonprofits" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All nonprofits</SelectItem>
            {nonprofitOptions.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Nonprofit</TableHead>
                <TableHead>EIN</TableHead>
                <TableHead>Food type</TableHead>
                <TableHead className="text-right">Lbs</TableHead>
                <TableHead className="text-right">FMV</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No receipts for this filter.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.food_listings?.created_at ? new Date(r.food_listings.created_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{r.nonprofits?.organization_name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.nonprofits?.ein || "—"}</TableCell>
                  <TableCell className="capitalize">{String(r.food_listings?.food_type || "").replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right">{Number(r.food_listings?.pounds || 0).toFixed(1)}</TableCell>
                  <TableCell className="text-right">${Number(r.food_listings?.estimated_donation_value || 0).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{r.receipt_type || "generated"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openReceiptPdf(r.pdf_path)}>
                      <FileText className="h-4 w-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
