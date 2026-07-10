import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import type { FoodListing, Location, FoodType } from "@/types/database";
import { openReceiptPdf } from "@/lib/taxReceipts";

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "prepared_meals", label: "Prepared Meals" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "meat_protein", label: "Meat / Protein" },
  { value: "baked_goods", label: "Baked Goods" },
  { value: "shelf_stable", label: "Shelf Stable" },
  { value: "frozen", label: "Frozen" },
];

type LineItem = { description: string; quantity: string; unit_value: string };
const emptyLine = (): LineItem => ({ description: "", quantity: "1", unit_value: "" });

const emptyDonation = {
  food_type: "prepared_meals" as FoodType,
  pounds: "", estimated_donation_value: "", pickup_address: "",
  pickup_window_start: "", pickup_window_end: "", notes: "",
};

export default function VenueDonations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyDonation);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [itemized, setItemized] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);

  const lineItemsTotal = lineItems.reduce((sum, li) => {
    const q = Number(li.quantity) || 0;
    const v = Number(li.unit_value) || 0;
    return sum + q * v;
  }, 0);

  const { data: locations = [] } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["venue-listings", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("organization_id", profile!.organization_id!).eq("listing_type", "donation").order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.organization_id,
  });

  const listingIds = listings.map((l) => l.id);
  const { data: receipts = [] } = useQuery({
    queryKey: ["venue-tax-receipts", profile?.organization_id, listingIds],
    queryFn: async () => {
      if (!listingIds.length) return [];
      const { data } = await supabase
        .from("tax_receipts")
        .select("food_listing_id, pdf_path, receipt_type, submitted_at")
        .in("food_listing_id", listingIds)
        .order("submitted_at", { ascending: false });
      return data || [];
    },
    enabled: !!profile?.organization_id && listingIds.length > 0,
  });
  const receiptMap: Record<string, { pdf_path: string }> = {};
  for (const r of receipts) if (!receiptMap[r.food_listing_id]) receiptMap[r.food_listing_id] = r;


  const createDonation = useMutation({
    mutationFn: async () => {
      const locId = selectedLocationId || locations[0]?.id;
      if (!locId || !profile?.organization_id) throw new Error("No location selected");
      const loc = locations.find((l) => l.id === locId);

      // If itemized, validate at least one non-empty line with a value.
      let validItems: LineItem[] = [];
      if (itemized) {
        validItems = lineItems.filter((li) => li.description.trim() && Number(li.quantity) > 0 && Number(li.unit_value) >= 0);
        if (validItems.length === 0) throw new Error("Add at least one itemized line with a description and quantity");
      }

      const initialValue = itemized
        ? validItems.reduce((s, li) => s + Number(li.quantity) * Number(li.unit_value), 0)
        : (form.estimated_donation_value ? Number(form.estimated_donation_value) : null);

      const { data: inserted, error } = await supabase.from("food_listings").insert({
        location_id: locId, organization_id: profile.organization_id,
        listing_type: "donation" as const, food_type: form.food_type,
        pounds: form.pounds ? Number(form.pounds) : null,
        estimated_donation_value: initialValue,
        pickup_address: form.pickup_address || loc?.pickup_address || null,
        pickup_window_start: form.pickup_window_start || null,
        pickup_window_end: form.pickup_window_end || null,
        notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;

      if (itemized && validItems.length && inserted?.id) {
        const rows = validItems.map((li) => ({
          food_listing_id: inserted.id,
          description: li.description.trim(),
          quantity: Number(li.quantity),
          unit_value: Number(li.unit_value),
        }));
        const { error: liErr } = await supabase.from("donation_line_items").insert(rows);
        if (liErr) throw liErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-listings"] });
      toast.success("Donation posted!");
      setDialogOpen(false);
      setForm(emptyDonation);
      setItemized(false);
      setLineItems([emptyLine()]);
    },
    onError: (e) => toast.error(e.message),
  });

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  const filtered = listings.filter((l) => {
    if (filterLocation !== "all" && l.location_id !== filterLocation) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all food donations across your locations</p>
        </div>
        <Button size="lg" onClick={() => { setForm(emptyDonation); setSelectedLocationId(locations[0]?.id || ""); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Post Donation
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {locations.length > 1 && (
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Food Type</TableHead>
              <TableHead>Pounds</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No donations posted yet — click "Post Donation" to get started.</TableCell></TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{locMap[d.location_id] || "—"}</TableCell>
                <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                <TableCell>{d.pounds || "—"}</TableCell>
                <TableCell>{d.estimated_donation_value ? `$${d.estimated_donation_value}` : "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${d.status === "posted" ? "bg-chart-1/15 text-chart-1" : d.status === "completed" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{formatStatus(d.status)}</span></TableCell>
                <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {receiptMap[d.id] ? (
                    <Button variant="ghost" size="sm" onClick={() => openReceiptPdf(receiptMap[d.id].pdf_path)}>
                      <FileText className="w-3.5 h-3.5 mr-1" /> Download
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Post a Donation</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            {locations.length > 1 && (
              <div>
                <Label>Location</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Food Type *</Label>
              <Select value={form.food_type} onValueChange={(v) => setForm({ ...form, food_type: v as FoodType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FOOD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Estimated Pounds *</Label><Input type="number" value={form.pounds} onChange={(e) => setForm({ ...form, pounds: e.target.value })} placeholder="e.g. 50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Pickup Start *</Label><Input type="datetime-local" value={form.pickup_window_start} onChange={(e) => setForm({ ...form, pickup_window_start: e.target.value })} /></div>
              <div><Label>Pickup End *</Label><Input type="datetime-local" value={form.pickup_window_end} onChange={(e) => setForm({ ...form, pickup_window_end: e.target.value })} /></div>
            </div>
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Itemize value</Label>
                  <p className="text-xs text-muted-foreground">Track each item separately for tax receipts.</p>
                </div>
                <Switch checked={itemized} onCheckedChange={setItemized} />
              </div>
              {!itemized ? (
                <div>
                  <Label>Est. Value ($) <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="number" step="0.01" min="0" value={form.estimated_donation_value} onChange={(e) => setForm({ ...form, estimated_donation_value: e.target.value })} />
                </div>
              ) : (
                <div className="space-y-2">
                  {lineItems.map((li, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_70px_90px_auto] gap-2 items-end">
                      <div>
                        {idx === 0 && <Label className="text-xs">Description</Label>}
                        <Input placeholder="e.g. Turkey sandwich" value={li.description}
                          onChange={(e) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-xs">Qty</Label>}
                        <Input type="number" min="0" step="1" value={li.quantity}
                          onChange={(e) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                      </div>
                      <div>
                        {idx === 0 && <Label className="text-xs">Unit $</Label>}
                        <Input type="number" min="0" step="0.01" value={li.unit_value}
                          onChange={(e) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, unit_value: e.target.value } : x))} />
                      </div>
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => setLineItems(lineItems.length === 1 ? [emptyLine()] : lineItems.filter((_, i) => i !== idx))}
                        aria-label="Remove line">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setLineItems([...lineItems, emptyLine()])}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add item
                    </Button>
                    <div className="text-sm font-semibold">Total: ${lineItemsTotal.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
            <div><Label>Pickup Address <span className="text-muted-foreground text-xs">(optional — defaults to location)</span></Label><Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>
            <div><Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" size="lg" onClick={() => createDonation.mutate()} disabled={!form.food_type || !form.pounds || !form.pickup_window_start || !form.pickup_window_end || createDonation.isPending}>
              {createDonation.isPending ? "Posting..." : "Post Donation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
