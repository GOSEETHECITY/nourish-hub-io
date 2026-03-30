import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowUpDown, Pencil, Trash2, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { HarietEvent, EventStatus } from "@/types/database";

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  archived: "bg-chart-4/15 text-chart-4",
};

const emptyForm = {
  title: "", description: "", event_date: "", start_time: "", end_time: "",
  address: "", city: "", state: "", external_link: "", status: "draft" as EventStatus,
  image_url: "", offer_badge: "",
};

export default function Events() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<HarietEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const flyerCanvasRef = useRef<HTMLCanvasElement>(null);

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

  const removeImage = () => {
    setForm({ ...form, image_url: "" });
  };

  const saveEvent = useMutation({
    mutationFn: async () => {
      const shareUrl = `/event-preview/${editingEvent?.id || "temp"}`;
      const payload: any = {
        title: form.title, description: form.description || null,
        event_date: form.event_date || null, start_time: form.start_time || null,
        end_time: form.end_time || null, address: form.address || null,
        city: form.city || null, state: form.state || null,
        external_link: form.external_link || null, status: form.status,
        image_url: form.image_url || null,
        offer_badge: form.offer_badge || null,
      };
      if (editingEvent) {
        payload.share_url = `/event-preview/${editingEvent.id}`;
        const { error } = await supabase.from("events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("events").insert(payload).select("id").single();
        if (error) throw error;
        // Update share_url with actual id
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
      city: ev.city || "", state: ev.state || "", external_link: ev.external_link || "",
      status: ev.status, image_url: ev.image_url || "", offer_badge: ev.offer_badge || "",
    });
    setDialogOpen(true);
  };

  const downloadFlyer = (ev: HarietEvent) => {
    if (ev.image_url) {
      // Download the uploaded image
      const link = document.createElement("a");
      link.href = ev.image_url;
      link.download = `${ev.title.replace(/\s+/g, "-")}-flyer.png`;
      link.target = "_blank";
      link.click();
      return;
    }
    // Generate flyer canvas
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 1000);
    grad.addColorStop(0, "#F97316");
    grad.addColorStop(1, "#8DC63F");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 1000);

    // White card
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(40, 40, 720, 920, 24);
    ctx.fill();

    // Brand text
    ctx.fillStyle = "#F97316";
    ctx.font = "bold 36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO", 360, 110);
    ctx.fillStyle = "#1B2A4A";
    ctx.fillText("See The City", 460, 110);

    // Title
    ctx.fillStyle = "#1B2A4A";
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.textAlign = "center";
    const titleLines = wrapText(ctx, ev.title, 640);
    let y = 220;
    titleLines.forEach((line) => { ctx.fillText(line, 400, y); y += 60; });

    // Offer badge
    if (ev.offer_badge) {
      ctx.fillStyle = "#F97316";
      const badgeW = ctx.measureText(ev.offer_badge).width + 40;
      ctx.beginPath();
      ctx.roundRect(400 - badgeW / 2, y + 10, badgeW, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.fillText(ev.offer_badge, 400, y + 38);
      y += 70;
    }

    // City, State, Date
    ctx.fillStyle = "#666666";
    ctx.font = "24px Arial, sans-serif";
    const location = [ev.city, ev.state].filter(Boolean).join(", ");
    if (location) { ctx.fillText(location, 400, y + 30); y += 40; }
    if (ev.event_date) { ctx.fillText(new Date(ev.event_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }), 400, y + 30); y += 40; }

    // QR code placeholder
    ctx.fillStyle = "#1B2A4A";
    ctx.fillRect(620, 800, 100, 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px Arial";
    ctx.fillText("QR CODE", 670, 855);

    // Download
    const link = document.createElement("a");
    link.download = `${ev.title.replace(/\s+/g, "-")}-flyer.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    words.forEach((word) => {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const sorted = useMemo(() => {
    return [...events].sort((a: any, b: any) => {
      const av = a[sortField], bv = b[sortField];
      if (av == null) return 1; if (bv == null) return -1;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [events, sortField, sortAsc]);

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

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="title">Event Title</SortHead>
              <SortHead field="city">City</SortHead>
              <SortHead field="event_date">Date</SortHead>
              <TableHead>Status</TableHead>
              <SortHead field="share_count">Shares</SortHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No events found</TableCell></TableRow>
            ) : sorted.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="font-medium">{ev.title}</TableCell>
                <TableCell>{ev.city || "—"}</TableCell>
                <TableCell>{ev.event_date ? new Date(ev.event_date + "T00:00:00").toLocaleDateString() : "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[ev.status]}`}>{ev.status}</span></TableCell>
                <TableCell>{ev.share_count || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(ev)} title="Edit"><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => downloadFlyer(ev)} title="Download Flyer"><Download className="w-3 h-3" /></Button>
                    {ev.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => togglePublish.mutate({ id: ev.id, newStatus: "published" })}>Publish</Button>
                    )}
                    {ev.status === "published" && (
                      <Button size="sm" variant="outline" onClick={() => togglePublish.mutate({ id: ev.id, newStatus: "draft" })}>Unpublish</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(ev.id)} title="Delete"><Trash2 className="w-3 h-3" /></Button>
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
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Event Date *</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Offer Badge Text</Label><Input value={form.offer_badge} onChange={(e) => setForm({ ...form, offer_badge: e.target.value })} placeholder="e.g. First 100 Free Tacos" /></div>
            <div>
              <Label>Event Image / Flyer</Label>
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="Event" className="w-full max-h-48 object-contain rounded-lg mb-2 bg-muted" />
                  <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={removeImage}>Remove</Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-1">No image uploaded — an auto-generated flyer will be used</p>
              )}
              <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
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
            <Button className="w-full" onClick={() => saveEvent.mutate()} disabled={!form.title || !form.city || !form.state || saveEvent.isPending}>
              {saveEvent.isPending ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Event</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this event? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteConfirm) deleteEvent.mutate(deleteConfirm); setDeleteConfirm(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
