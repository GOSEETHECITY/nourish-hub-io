import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowUpDown, Download, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import StatusChip, { toStateAbbr } from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";
import type { HarietEvent, EventStatus } from "@/types/database";

const emptyForm = {
  title: "", description: "", event_date: "", start_time: "", end_time: "",
  address: "", city: "", state: "", county: "", external_link: "", status: "draft" as EventStatus,
  image_url: "", offer_badge: "", flyer_url: "",
};

export default function Events() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HarietEvent | null>(null);
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [flyerUploading, setFlyerUploading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as HarietEvent[];
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { toast.error("Only JPG, PNG, WebP, and GIF accepted"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("events").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("events").getPublicUrl(path);
    setForm({ ...form, image_url: urlData.publicUrl });
    setUploading(false);
    toast.success("Image uploaded");
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    if (!["image/jpeg", "image/png"].includes(file.type)) { toast.error("Only JPG and PNG accepted for flyers"); return; }
    setFlyerUploading(true);
    const ext = file.name.split(".").pop();
    const path = `flyers/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("events").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); setFlyerUploading(false); return; }
    const { data: urlData } = supabase.storage.from("events").getPublicUrl(path);
    setForm({ ...form, flyer_url: urlData.publicUrl });
    setFlyerUploading(false);
    toast.success("Flyer uploaded");
  };

  const generateDescriptionFromFlyer = async () => {
    if (!form.flyer_url) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-event-description-from-flyer", {
        body: { flyer_url: form.flyer_url },
      });
      if (error) throw error;
      setForm({ ...form, description: data.description || "" });
      toast.success("Description generated from flyer");
    } catch (err: any) {
      toast.error("Failed to generate description: " + err.message);
    }
    setAiGenerating(false);
  };

  const saveEvent = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title, description: form.description || null,
        event_date: form.event_date || null, start_time: form.start_time || null,
        end_time: form.end_time || null, address: form.address || null,
        city: form.city || null, state: form.state || null,
        county: form.county,
        external_link: form.external_link || null, status: form.status,
        image_url: form.image_url || null,
        offer_badge: form.offer_badge || null,
        flyer_url: form.flyer_url || null,
      };
      if (editingEvent) {
        payload.share_url = `/event-preview/${editingEvent.id}`;
        const { error } = await supabase.from("events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("events").insert(payload).select("id").single();
        if (error) throw error;
        await supabase.from("events").update({ share_url: `/event-preview/${data.id}` }).eq("id", data.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(editingEvent ? "Event updated" : "Event created");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: EventStatus }) => {
      const { error } = await supabase.from("events").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(newStatus === "published" ? "Event published" : "Event unpublished");
    },
  });

  const closeDialog = () => { setDialogOpen(false); setEditingEvent(null); setForm(emptyForm); };

  const openEdit = (ev: HarietEvent) => {
    setEditingEvent(ev);
    setForm({
      title: ev.title, description: ev.description || "", event_date: ev.event_date || "",
      start_time: ev.start_time || "", end_time: ev.end_time || "", address: ev.address || "",
      city: ev.city || "", state: ev.state || "", county: ev.county || "",
      external_link: ev.external_link || "", status: ev.status, image_url: ev.image_url || "",
      offer_badge: ev.offer_badge || "", flyer_url: ev.flyer_url || "",
    });
    setDialogOpen(true);
  };

  const downloadFlyer = (ev: HarietEvent) => {
    if (ev.flyer_url || ev.image_url) {
      const link = document.createElement("a");
      link.href = ev.flyer_url || ev.image_url!;
      link.download = `${ev.title.replace(/\s+/g, "-")}-flyer.png`;
      link.target = "_blank";
      link.click();
      return;
    }
    toast.error("No flyer or image available");
  };

  const sorted = useMemo(() => {
    let list = [...events];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((ev) => [ev.title, ev.city, ev.county].filter(Boolean).some((f) => f!.toLowerCase().includes(q)));
    }
    return list.sort((a: any, b: any) => {
      const av = a[sortField], bv = b[sortField];
      if (av == null) return 1; if (bv == null) return -1;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [events, search, sortField, sortAsc]);

  const toggleSort = (field: string) => { if (sortField === field) setSortAsc(!sortAsc); else { setSortField(field); setSortAsc(true); } };
  const SortHead = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage platform events</p>
        </div>
        <Button onClick={() => { setEditingEvent(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Event</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="title">Event Title</SortHead>
              <SortHead field="city">City</SortHead>
              <TableHead>State</TableHead>
              <SortHead field="county">County</SortHead>
              <SortHead field="event_date">Date</SortHead>
              <TableHead>Status</TableHead>
              <SortHead field="share_count">Shares</SortHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No events found</TableCell></TableRow>
            ) : sorted.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="font-medium">{ev.title}</TableCell>
                <TableCell>{ev.city || "—"}</TableCell>
                <TableCell>{toStateAbbr(ev.state)}</TableCell>
                <TableCell>{ev.county || "—"}</TableCell>
                <TableCell>{ev.event_date ? new Date(ev.event_date + "T00:00:00").toLocaleDateString() : "—"}</TableCell>
                <TableCell><StatusChip status={ev.status} /></TableCell>
                <TableCell>{ev.share_count || 0}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {ev.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => togglePublish.mutate({ id: ev.id, newStatus: "published" })}>Publish</Button>
                    )}
                    {ev.status === "published" && (
                      <Button size="sm" variant="outline" onClick={() => togglePublish.mutate({ id: ev.id, newStatus: "draft" })}>Unpublish</Button>
                    )}
                    <ActionsMenu
                      entityName={ev.title}
                      onView={() => openEdit(ev)}
                      onEdit={() => openEdit(ev)}
                      onDelete={() => deleteEvent.mutate(ev.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>City *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State *</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <div><Label>County *</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} placeholder="e.g. Kings County" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Event Date *</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Offer Badge Text</Label>
              <Input value={form.offer_badge} onChange={(e) => setForm({ ...form, offer_badge: e.target.value.slice(0, 40) })} placeholder="e.g. First 100 Free Tacos" maxLength={40} />
              <p className="text-xs text-muted-foreground mt-1">A short highlight pulled from the event description. Shown as a badge on the event card in the consumer app to increase conversions. ({form.offer_badge.length}/40)</p>
            </div>
            <div>
              <Label>Event Image</Label>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="Event" className="w-full max-h-48 object-contain rounded-lg mb-2 bg-muted" />
                  <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setForm({ ...form, image_url: "" })}>Remove</Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-1">No image uploaded — an auto-generated flyer will be used</p>
              )}
              <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
            </div>
            <div>
              <Label>Flyer Upload (PNG/JPG, max 5MB)</Label>
              {form.flyer_url ? (
                <div className="relative">
                  <img src={form.flyer_url} alt="Flyer" className="w-full max-h-48 object-contain rounded-lg mb-2 bg-muted" />
                  <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setForm({ ...form, flyer_url: "" })}>Remove</Button>
                </div>
              ) : null}
              <Input type="file" accept="image/jpeg,image/png" onChange={handleFlyerUpload} disabled={flyerUploading} />
              {flyerUploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
              {form.flyer_url && (
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={generateDescriptionFromFlyer} disabled={aiGenerating}>
                  <Sparkles className="w-4 h-4 mr-2" />{aiGenerating ? "Generating..." : "Generate description from flyer"}
                </Button>
              )}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => saveEvent.mutate()} disabled={!form.title || !form.city || !form.state || !form.county || saveEvent.isPending}>
              {saveEvent.isPending ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
