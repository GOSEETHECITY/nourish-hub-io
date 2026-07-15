import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Trash2, FileText, Heart } from "lucide-react";
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

const FLASH_ELIGIBLE_TYPES = new Set([
  "food_beverage_group",
  "restaurant_independent",
  "restaurant_multi_location",
  "franchise",
]);

const MAX_PHOTOS = 5;

type LineItem = { description: string; food_type: FoodType; pounds: string; unit_value: string };
const emptyLine = (): LineItem => ({ description: "", food_type: "prepared_meals", pounds: "", unit_value: "" });

const emptyDonation = {
  pickup_address: "",
  pickup_window_start: "",
  pickup_window_end: "",
  notes: "",
  flash_price: "",
  is_free_to_public: false,
};

export default function VenueDonations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyDonation);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [isFlash, setIsFlash] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const lineItemsPounds = useMemo(
    () => lineItems.reduce((s, li) => s + (Number(li.pounds) || 0), 0),
    [lineItems]
  );
  const lineItemsValue = useMemo(
    () => lineItems.reduce((s, li) => s + (Number(li.unit_value) || 0), 0),
    [lineItems]
  );

  const { data: org } = useQuery({
    queryKey: ["venue-org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("type, marketplace_enabled").eq("id", profile!.organization_id!).maybeSingle();
      if (error) throw error;
      return data as { type: string; marketplace_enabled: boolean } | null;
    },
    enabled: !!profile?.organization_id,
  });
  const canFlash = !!(org?.marketplace_enabled && FLASH_ELIGIBLE_TYPES.has(org.type));

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

  const openDialog = () => {
    setForm(emptyDonation);
    setIsFlash(false);
    setLineItems([emptyLine()]);
    setPhotoFiles([]);
    setSelectedLocationId(locations[0]?.id || "");
    setDialogOpen(true);
  };

  const uploadPhotos = async (orgId: string, listingId: string): Promise<string[]> => {
    if (!photoFiles.length) return [];
    const urls: string[] = [];
    for (const file of photoFiles) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${orgId}/${listingId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("donation-photos").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("donation-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    return urls;
  };

  const createDonation = useMutation({
    mutationFn: async () => {
      const locId = selectedLocationId || locations[0]?.id;
      if (!locId || !profile?.organization_id) throw new Error("No location selected");
      const loc = locations.find((l) => l.id === locId);

      const validItems = lineItems.filter((li) =>
        li.description.trim() && Number(li.pounds) > 0 && Number(li.unit_value) >= 0
      );
      if (validItems.length === 0) throw new Error("Add at least one item with description, weight, and value");

      const totalPounds = validItems.reduce((s, li) => s + Number(li.pounds), 0);
      const totalValue = validItems.reduce((s, li) => s + Number(li.unit_value), 0);
      const uniqueTypes = Array.from(new Set(validItems.map((li) => li.food_type)));
      const finalFoodType: FoodType = uniqueTypes.length > 1 ? ("mixed" as FoodType) : uniqueTypes[0];

      const flashPriceCents = isFlash && !form.is_free_to_public && form.flash_price
        ? Math.round(Number(form.flash_price) * 100)
        : (isFlash && form.is_free_to_public ? 0 : null);

      setUploading(true);
      // Upload photos first — we don't have listing id yet, so use a temp folder
      const tempId = crypto.randomUUID();
      let photoUrls: string[] = [];
      try {
        photoUrls = await uploadPhotos(profile.organization_id, tempId);
      } finally {
        setUploading(false);
      }

      const { data: inserted, error } = await supabase.from("food_listings").insert({
        location_id: locId,
        organization_id: profile.organization_id,
        listing_type: "donation" as const,
        food_type: finalFoodType,
        pounds: totalPounds,
        estimated_donation_value: totalValue,
        pickup_address: form.pickup_address || loc?.pickup_address || null,
        pickup_window_start: form.pickup_window_start || null,
        pickup_window_end: form.pickup_window_end || null,
        notes: form.notes || null,
        is_flash: isFlash === true,
        is_free_to_public: isFlash ? form.is_free_to_public : false,
        flash_price_cents: flashPriceCents,
        photo_urls: photoUrls.length ? photoUrls : null,
      } as any).select("id").single();
      if (error) throw error;

      if (inserted?.id) {
        const rows = validItems.map((li) => ({
          food_listing_id: inserted.id,
          description: li.description.trim(),
          food_type: li.food_type,
          pounds: Number(li.pounds),
          quantity: 1,
          unit_value: Number(li.unit_value),
        }));
        const { error: liErr } = await supabase.from("donation_line_items").insert(rows);
        if (liErr) throw liErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-listings"] });
      toast.success(isFlash ? "Flash rescue posted!" : "Donation posted!");
      setDialogOpen(false);
      setForm(emptyDonation);
      setLineItems([emptyLine()]);
      setPhotoFiles([]);
      setIsFlash(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const formatFoodType = (t: string | null | undefined) =>
    t === "mixed" ? "Mixed" : (t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");

  const filtered = listings.filter((l) => {
    if (filterLocation !== "all" && l.location_id !== filterLocation) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => /image\/(jpe?g|png|webp)/i.test(f.type));
    if (valid.length !== files.length) toast.error("Only JPG, PNG, or WEBP images");
    const combined = [...photoFiles, ...valid].slice(0, MAX_PHOTOS);
    if (photoFiles.length + valid.length > MAX_PHOTOS) toast.error(`Maximum ${MAX_PHOTOS} photos`);
    setPhotoFiles(combined);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Donations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all food donations across your locations</p>
        </div>
        <Button size="lg" onClick={openDialog}>
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
                <TableCell>{formatFoodType(d.food_type)}</TableCell>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isFlash ? "Post Flash Rescue" : "Post a Donation"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            {/* PHOTO UPLOAD — first field */}
            <div>
              <Label>Photos <span className="text-muted-foreground text-xs">(up to {MAX_PHOTOS} — helps nonprofits decide)</span></Label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button type="button"
                      onClick={() => setPhotoFiles(photoFiles.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 hover:bg-background">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < MAX_PHOTOS && (
                  <label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">Add photo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={onPhotoChange} />
                  </label>
                )}
              </div>
            </div>

            {canFlash && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Flash rescue (consumer pickup)</Label>
                    <p className="text-xs text-muted-foreground">Open to nearby consumers, first-come first-served, no nonprofit needed.</p>
                  </div>
                  <Switch checked={isFlash} onCheckedChange={setIsFlash} />
                </div>
                {isFlash && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Free to public</Label>
                      <Switch
                        checked={form.is_free_to_public}
                        onCheckedChange={(v) => setForm({ ...form, is_free_to_public: v })}
                      />
                    </div>
                    {!form.is_free_to_public && (
                      <div>
                        <Label>Consumer price ($) *</Label>
                        <Input type="number" min="0" step="0.01" value={form.flash_price}
                          onChange={(e) => setForm({ ...form, flash_price: e.target.value })}
                          placeholder="e.g. 4.99" />
                        <p className="text-xs text-muted-foreground mt-1">Platform keeps 10%. Pickup window below is the flash window.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {locations.length > 1 && (
              <div>
                <Label>Location</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Pickup Start *</Label><Input type="datetime-local" value={form.pickup_window_start} onChange={(e) => setForm({ ...form, pickup_window_start: e.target.value })} /></div>
              <div><Label>Pickup End *</Label><Input type="datetime-local" value={form.pickup_window_end} onChange={(e) => setForm({ ...form, pickup_window_end: e.target.value })} /></div>
            </div>

            {/* ITEMIZED LINES — always shown */}
            <div className="rounded-lg border p-3 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Items *</Label>
                <p className="text-xs text-muted-foreground">List each item with its food type, weight, and value.</p>
              </div>
              <div className="space-y-3">
                {lineItems.map((li, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end pb-2 border-b last:border-b-0">
                    <div className="col-span-12">
                      <Label className="text-xs">Description</Label>
                      <Input placeholder="e.g. Turkey sandwich trays" value={li.description}
                        onChange={(e) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))} />
                    </div>
                    <div className="col-span-5">
                      <Label className="text-xs">Food type</Label>
                      <Select value={li.food_type} onValueChange={(v) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, food_type: v as FoodType } : x))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{FOOD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Weight (lbs)</Label>
                      <Input type="number" min="0" step="0.01" value={li.pounds}
                        onChange={(e) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, pounds: e.target.value } : x))} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Value ($)</Label>
                      <Input type="number" min="0" step="0.01" value={li.unit_value}
                        onChange={(e) => setLineItems(lineItems.map((x, i) => i === idx ? { ...x, unit_value: e.target.value } : x))} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => setLineItems(lineItems.length === 1 ? [emptyLine()] : lineItems.filter((_, i) => i !== idx))}
                        aria-label="Remove line">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setLineItems([...lineItems, emptyLine()])}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add item
                  </Button>
                  <div className="text-sm font-semibold">
                    <span className="text-muted-foreground font-normal mr-3">Total: {lineItemsPounds || 0} lbs</span>
                    ${lineItemsValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div><Label>Pickup Address <span className="text-muted-foreground text-xs">(optional — defaults to location)</span></Label><Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>
            <div><Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <Button className="w-full" size="lg" onClick={() => createDonation.mutate()}
              disabled={!form.pickup_window_start || !form.pickup_window_end
                || lineItemsPounds <= 0
                || (isFlash && !form.is_free_to_public && !form.flash_price)
                || createDonation.isPending || uploading}>
              {uploading ? "Uploading photos..." : createDonation.isPending ? "Posting..." : (isFlash ? "Post Flash Rescue" : "Post Donation")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
