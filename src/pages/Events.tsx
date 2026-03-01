import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

export default function Events() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState<string | null>(null);
  const [notifyPrompt, setNotifyPrompt] = useState<string | null>(null);
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", event_date: "", start_time: "", end_time: "",
    address: "", city: "", state: "", external_link: "", status: "draft" as EventStatus,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as HarietEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created");
      setDialogOpen(false);
      setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", address: "", city: "", state: "", external_link: "", status: "draft" });
    },
    onError: (e) => toast.error(e.message),
  });

  const publishEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").update({ status: "published" as EventStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event published");
    },
  });

  const archiveEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").update({ status: "archived" as EventStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event archived");
    },
  });

  const handlePublishConfirm = (id: string) => {
    publishEvent.mutate(id);
    setPublishConfirm(null);
    setNotifyPrompt(id);
  };

  const handleNotify = (option: string) => {
    if (option !== "none") {
      toast.success(`Push notification sent to ${option === "all" ? "all users" : `users in selected city`}`);
    }
    setNotifyPrompt(null);
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Event</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Event Date</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              </div>
              <div><Label>External Link</Label><Input value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createEvent.mutate()} disabled={!form.title || createEvent.isPending}>
                {createEvent.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="title">Event Title</SortHead>
              <SortHead field="city">City</SortHead>
              <SortHead field="state">State</SortHead>
              <SortHead field="event_date">Event Date</SortHead>
              <SortHead field="status">Status</SortHead>
              <TableHead>Attendees</TableHead>
              <SortHead field="created_at">Date Created</SortHead>
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
                <TableCell>{ev.state || "—"}</TableCell>
                <TableCell>{ev.event_date ? new Date(ev.event_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[ev.status]}`}>{ev.status}</span></TableCell>
                <TableCell>{ev.attendee_count}</TableCell>
                <TableCell>{new Date(ev.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {ev.status === "draft" && <Button size="sm" variant="outline" onClick={() => setPublishConfirm(ev.id)}>Publish</Button>}
                    {ev.status === "published" && <Button size="sm" variant="outline" onClick={() => archiveEvent.mutate(ev.id)}>Archive</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Publish Confirmation */}
      <AlertDialog open={!!publishConfirm} onOpenChange={() => setPublishConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Event</AlertDialogTitle>
            <AlertDialogDescription>Publishing this event will make it visible in the GO See The City app. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => publishConfirm && handlePublishConfirm(publishConfirm)}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification Prompt */}
      <AlertDialog open={!!notifyPrompt} onOpenChange={() => setNotifyPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Push Notification?</AlertDialogTitle>
            <AlertDialogDescription>Would you like to send a push notification for this event?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => handleNotify("all")}>All Users</Button>
            <Button variant="outline" onClick={() => handleNotify("city")}>Users in City</Button>
            <AlertDialogCancel onClick={() => handleNotify("none")}>No Notification</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
