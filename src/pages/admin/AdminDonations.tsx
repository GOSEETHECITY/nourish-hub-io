import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import EmptyState from "@/components/EmptyState";
import { Package, Loader2, Plus, Trash2 } from "lucide-react";

const STATUSES = ["posted", "claimed", "picked_up", "pending_impact_report", "completed", "cancelled"] as const;

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_value: number;
  pounds: number | null;
}

interface DonationRow {
  id: string;
  created_at: string;
  status: string;
  pounds: number | null;
  estimated_donation_value: number | null;
  pickup_window_start: string | null;
  pickup_window_end: string | null;
  notes: string | null;
  organization_id: string;
  nonprofit_claimed_id: string | null;
  organizations: { name: string } | null;
  nonprofits: { organization_name: string } | null;
}

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const toLocalInput = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};
const label = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export default function AdminDonations() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(params.get("status") ?? "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<DonationRow | null>(null);

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ["admin-donations", status, from, to],
    queryFn: async () => {
      let q = supabase
        .from("food_listings")
        .select("id, created_at, status, pounds, estimated_donation_value, pickup_window_start, pickup_window_end, notes, organization_id, nonprofit_claimed_id, organizations(name), nonprofits!food_listings_nonprofit_claimed_id_fkey(organization_name)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (status !== "all") q = q.eq("status", status as any);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(`${to}T23:59:59`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as DonationRow[];
    },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["admin-nonprofits-approved"],
    queryFn: async () => {
      const { data } = await supabase.from("nonprofits").select("id, organization_name").eq("approval_status", "approved").order("organization_name");
      return (data ?? []) as { id: string; organization_name: string }[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return donations;
    return donations.filter(
      (d) =>
        (d.organizations?.name ?? "").toLowerCase().includes(term) ||
        (d.nonprofits?.organization_name ?? "").toLowerCase().includes(term),
    );
  }, [donations, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Donations</h1>
        <p className="text-sm text-muted-foreground mt-1">Every donation posted across the platform</p>
      </div>

      <div className="bg-card rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input placeholder="Search venue or nonprofit" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        {isLoading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="No donations match" description="Try clearing the search or widening the date range." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Nonprofit</TableHead>
                  <TableHead>Pounds</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead>Pickup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setEditing(d)}>
                    <TableCell className="font-medium">{d.organizations?.name ?? "—"}</TableCell>
                    <TableCell>{d.nonprofits?.organization_name ?? <span className="text-muted-foreground">Unclaimed</span>}</TableCell>
                    <TableCell>{d.pounds ?? "—"}</TableCell>
                    <TableCell>{d.estimated_donation_value ? `$${Number(d.estimated_donation_value).toLocaleString()}` : "—"}</TableCell>
                    <TableCell><span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-muted">{label(d.status)}</span></TableCell>
                    <TableCell>{fmtDate(d.created_at)}</TableCell>
                    <TableCell>{fmtDate(d.pickup_window_start)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && (
        <EditDonationDialog
          donation={editing}
          nonprofits={nonprofits}
          adminUserId={profile?.id ?? null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin-donations"] });
            qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
          }}
        />
      )}
    </div>
  );
}

function EditDonationDialog({
  donation, nonprofits, adminUserId, onClose, onSaved,
}: {
  donation: DonationRow;
  nonprofits: { id: string; organization_name: string }[];
  adminUserId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(donation.status);
  const [nonprofitId, setNonprofitId] = useState(donation.nonprofit_claimed_id ?? "none");
  const [windowStart, setWindowStart] = useState(toLocalInput(donation.pickup_window_start));
  const [windowEnd, setWindowEnd] = useState(toLocalInput(donation.pickup_window_end));
  const [notes, setNotes] = useState(donation.notes ?? "");

  const { data: initialItems = [], isLoading } = useQuery({
    queryKey: ["admin-donation-items", donation.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("donation_line_items")
        .select("id, description, quantity, unit_value, pounds")
        .eq("food_listing_id", donation.id)
        .order("created_at");
      return (data ?? []) as LineItem[];
    },
  });
  const [items, setItems] = useState<LineItem[] | null>(null);
  const rows = items ?? initialItems;

  const totalValue = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_value || 0), 0);
  const totalPounds = rows.reduce((s, r) => s + Number(r.pounds || 0), 0);

  const update = (i: number, patch: Partial<LineItem>) =>
    setItems(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    try {
      const audit: any[] = [];
      const track = (field: string, oldV: unknown, newV: unknown) => {
        if (String(oldV ?? "") !== String(newV ?? "")) {
          audit.push({
            admin_user_id: adminUserId,
            donation_id: donation.id,
            field_name: field,
            old_value: oldV == null ? null : String(oldV),
            new_value: newV == null ? null : String(newV),
          });
        }
      };

      const newNonprofit = nonprofitId === "none" ? null : nonprofitId;
      const startIso = windowStart ? new Date(windowStart).toISOString() : null;
      const endIso = windowEnd ? new Date(windowEnd).toISOString() : null;

      track("status", donation.status, status);
      track("nonprofit_claimed_id", donation.nonprofit_claimed_id, newNonprofit);
      track("pickup_window_start", donation.pickup_window_start, startIso);
      track("pickup_window_end", donation.pickup_window_end, endIso);
      track("notes", donation.notes, notes);

      // Line items: replace the set when edited, which retriggers the value sync trigger.
      if (items) {
        const { error: delErr } = await supabase.from("donation_line_items").delete().eq("food_listing_id", donation.id);
        if (delErr) throw delErr;
        if (rows.length) {
          const { error: insErr } = await supabase.from("donation_line_items").insert(
            rows.map((r) => ({
              food_listing_id: donation.id,
              description: r.description || "Item",
              quantity: Number(r.quantity) || 0,
              unit_value: Number(r.unit_value) || 0,
              pounds: r.pounds == null || r.pounds === ("" as any) ? null : Number(r.pounds),
            })),
          );
          if (insErr) throw insErr;
        }
        track("line_items_total_value", donation.estimated_donation_value, totalValue.toFixed(2));
        track("pounds", donation.pounds, totalPounds);
      }

      const patch = {
        status: status as DonationRow["status"],
        nonprofit_claimed_id: newNonprofit,
        pickup_window_start: startIso,
        pickup_window_end: endIso,
        notes: notes || null,
        ...(items ? { pounds: totalPounds || null } : {}),
      };

      const { error } = await supabase.from("food_listings").update(patch as never).eq("id", donation.id);
      if (error) throw error;

      if (audit.length) await supabase.from("admin_audit_log").insert(audit);

      toast({ title: "Donation updated", description: `${audit.length} change${audit.length === 1 ? "" : "s"} logged.` });
      onSaved();
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit donation</DialogTitle>
          <DialogDescription>{donation.organizations?.name ?? "Venue"} · posted {fmtDate(donation.created_at)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned nonprofit</Label>
              <Select value={nonprofitId} onValueChange={setNonprofitId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unclaimed</SelectItem>
                  {nonprofits.map((n) => <SelectItem key={n.id} value={n.id}>{n.organization_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pickup window start</Label>
              <Input type="datetime-local" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pickup window end</Label>
              <Input type="datetime-local" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems([...rows, { description: "", quantity: 1, unit_value: 0, pounds: null }])}>
                <Plus className="w-4 h-4 mr-1" />Add item
              </Button>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading items…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items recorded.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={r.id ?? `new-${i}`} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5" placeholder="Description" value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
                    <Input className="col-span-2" type="number" min={0} placeholder="Qty" value={r.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-2" type="number" min={0} step="0.01" placeholder="Unit $" value={r.unit_value} onChange={(e) => update(i, { unit_value: Number(e.target.value) })} />
                    <Input className="col-span-2" type="number" min={0} step="0.01" placeholder="Lbs" value={r.pounds ?? ""} onChange={(e) => update(i, { pounds: e.target.value === "" ? null : Number(e.target.value) })} />
                    <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setItems(rows.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-6 pt-2 text-sm">
              <span className="text-muted-foreground">Total pounds: <strong className="text-foreground">{totalPounds.toLocaleString()}</strong></span>
              <span className="text-muted-foreground">Total value: <strong className="text-foreground">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving</> : "Save changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
