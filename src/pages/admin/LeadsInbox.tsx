import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Status = "new" | "contacted" | "in_progress" | "converted" | "not_interested";
type Lead = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  organization: string | null;
  pathway: string | null;
  address: string | null;
  comments: string | null;
  notes: string | null;
  source: string | null;
  status: Status;
};

const STATUSES: Status[] = ["new", "contacted", "in_progress", "converted", "not_interested"];

const LeadsInbox = () => {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<Status | "">("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("partner_leads").select("*").order("created_at", { ascending: false });
    if (filterStatus) q = q.eq("status", filterStatus);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Lead[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterStatus]);

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("partner_leads").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows(rs => rs.map(r => r.id === id ? { ...r, status } : r));
    toast.success("Status updated");
  };

  const csv = useMemo(() => {
    const header = ["Created", "Name", "Email", "Phone", "Organization", "Pathway", "Address", "Comments", "Source", "Status"];
    const lines = [header.join(",")].concat(
      rows.map(r => [
        r.created_at, r.name, r.email, r.phone, r.organization, r.pathway,
        r.address, r.comments || r.notes, r.source, r.status,
      ].map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(","))
    );
    return lines.join("\n");
  }, [rows]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `partner-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New leads inbox</h1>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status | "")}
            className="border rounded px-3 py-1 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <Button onClick={downloadCsv} variant="outline">Export CSV</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Submitted</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-left p-3">Organization</th>
                <th className="text-left p-3">Address</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No leads yet.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground">{r.phone}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.organization}</div>
                    <div className="text-xs text-muted-foreground">{r.pathway}</div>
                    {(r.comments || r.notes) && <div className="text-xs mt-1 max-w-xs">{r.comments || r.notes}</div>}
                  </td>
                  <td className="p-3 text-xs max-w-xs">{r.address}</td>
                  <td className="p-3 text-xs">{r.source}</td>
                  <td className="p-3">
                    <select value={r.status} onChange={e => updateStatus(r.id, e.target.value as Status)}
                      className="border rounded px-2 py-1 text-xs">
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline"
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: r.organization || "",
                          email: r.email || "",
                          phone: r.phone || "",
                          address: r.address || "",
                          type: r.pathway || "",
                        });
                        window.location.href = `/organizations?${params.toString()}`;
                      }}>
                      Convert
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default LeadsInbox;
