import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVenuePostingGate } from "@/hooks/useVenuePostingGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Plus, Trash2, X } from "lucide-react";

const db = supabase as any;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FOOD = ["prepared_meals", "produce", "dairy", "meat_protein", "baked_goods", "shelf_stable", "frozen", "mixed"];
const TZ = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles"];
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });
const empty = () => ({
  name: "", event_label: "", recurrence: "weekly", days_of_week: [5] as number[], event_dates: [] as string[], newDate: "",
  post_hour: 21, pickup_duration_hours: 3, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  food_type: "prepared_meals", estimated_pounds: "", item_description: "Surplus food", notes: "", location_id: "",
});

export default function VenueSchedules() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const gate = useVenuePostingGate(profile?.organization_id);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty());

  const { data: schedules = [] } = useQuery({
    queryKey: ["donation-schedules", profile?.organization_id],
    queryFn: async () => (await db.from("donation_schedules").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false })).data || [],
    enabled: !!profile?.organization_id,
  });

  const save = async () => {
    if (!f.name.trim()) return toast.error("Give the schedule a name");
    if (f.recurrence === "weekly" && !f.days_of_week.length) return toast.error("Pick at least one day");
    if (f.recurrence === "dates" && !f.event_dates.length) return toast.error("Add at least one event date");
    if (gate.missing.length) return toast.error(`Before scheduling donations you need to ${gate.missing.join(" and ")}.`);
    const loc = f.location_id || (gate.locations[0] as any)?.id;
    if (!loc) return toast.error("Add a location first");
    const { error } = await db.from("donation_schedules").insert({
      organization_id: profile!.organization_id, location_id: loc, name: f.name.trim(), event_label: f.event_label.trim() || null,
      recurrence: f.recurrence, days_of_week: f.recurrence === "weekly" ? f.days_of_week : [], event_dates: f.recurrence === "dates" ? f.event_dates : [],
      post_hour: f.post_hour, pickup_duration_hours: f.pickup_duration_hours, timezone: f.timezone, food_type: f.food_type,
      estimated_pounds: Number(f.estimated_pounds) || 0, item_description: f.item_description.trim() || "Surplus food",
      notes: f.notes.trim() || null, created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Schedule saved — donations will post automatically");
    setOpen(false); qc.invalidateQueries({ queryKey: ["donation-schedules"] });
  };
  const toggle = async (id: string, active: boolean) => {
    const { error } = await db.from("donation_schedules").update({ active }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["donation-schedules"] });
  };
  const remove = async (id: string) => {
    const { error } = await db.from("donation_schedules").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["donation-schedules"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Donations</h1>
          <p className="text-sm text-muted-foreground mt-1">Post donations automatically after every home game, every Friday night, or any series of events.</p>
        </div>
        <Button onClick={() => { setF(empty()); setOpen(true); }} disabled={gate.dormant}><Plus className="w-4 h-4 mr-1" /> New schedule</Button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-card rounded-xl border p-10 text-center text-muted-foreground">
          <CalendarClock className="w-10 h-10 mx-auto mb-2" /> No schedules yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {schedules.map((s: any) => (
            <div key={s.id} className="bg-card rounded-xl border p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">{s.name}{s.event_label ? ` · ${s.event_label}` : ""}</p>
                <p className="text-sm text-muted-foreground">
                  {s.recurrence === "weekly" ? `Every ${s.days_of_week.map((d: number) => DAYS[d]).join(", ")}` : `${s.event_dates.length} event date${s.event_dates.length === 1 ? "" : "s"}: ${s.event_dates.slice(0, 4).join(", ")}${s.event_dates.length > 4 ? "…" : ""}`}
                  {` at ${hourLabel(s.post_hour)} · pickup within ${s.pickup_duration_hours}h · ${s.food_type.replace(/_/g, " ")}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{s.active ? "Active" : "Paused"}</span>
                <Switch checked={s.active} onCheckedChange={(v) => toggle(s.id, v)} />
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)} aria-label="Delete schedule"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New recurring donation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Schedule name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Post-game surplus" /></div>
            <div><Label>Linked event or series</Label><Input value={f.event_label} onChange={(e) => setF({ ...f, event_label: e.target.value })} placeholder="Home games, Friday night service" /></div>
            {gate.locations.length > 1 && (
              <div><Label>Location</Label>
                <Select value={f.location_id || (gate.locations[0] as any)?.id} onValueChange={(v) => setF({ ...f, location_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{gate.locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant={f.recurrence === "weekly" ? "default" : "outline"} onClick={() => setF({ ...f, recurrence: "weekly" })}>Every week</Button>
              <Button size="sm" variant={f.recurrence === "dates" ? "default" : "outline"} onClick={() => setF({ ...f, recurrence: "dates" })}>Specific event dates</Button>
            </div>
            {f.recurrence === "weekly" ? (
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d, i) => (
                  <Button key={d} size="sm" variant={f.days_of_week.includes(i) ? "default" : "outline"}
                    onClick={() => setF({ ...f, days_of_week: f.days_of_week.includes(i) ? f.days_of_week.filter((x) => x !== i) : [...f.days_of_week, i].sort() })}>{d}</Button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input type="date" min={new Date().toISOString().slice(0, 10)} value={f.newDate} onChange={(e) => setF({ ...f, newDate: e.target.value })} />
                  <Button variant="outline" disabled={!f.newDate} onClick={() => setF({ ...f, event_dates: [...new Set([...f.event_dates, f.newDate])].sort(), newDate: "" })}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {f.event_dates.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">{d}
                      <button aria-label={`Remove ${d}`} onClick={() => setF({ ...f, event_dates: f.event_dates.filter((x) => x !== d) })}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Post at</Label>
                <Select value={String(f.post_hour)} onValueChange={(v) => setF({ ...f, post_hour: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 24 }, (_, h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Pickup window (hours)</Label><Input type="number" min={1} max={24} value={f.pickup_duration_hours} onChange={(e) => setF({ ...f, pickup_duration_hours: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })} /></div>
            </div>
            <div><Label>Time zone</Label>
              <Select value={f.timezone} onValueChange={(v) => setF({ ...f, timezone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[...new Set([f.timezone, ...TZ])].map((t) => <SelectItem key={t} value={t}>{t.replace("America/", "").replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Food type</Label>
                <Select value={f.food_type} onValueChange={(v) => setF({ ...f, food_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOOD.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Estimated pounds</Label><Input type="number" min={0} value={f.estimated_pounds} onChange={(e) => setF({ ...f, estimated_pounds: e.target.value })} /></div>
            </div>
            <div><Label>Item description</Label><Input value={f.item_description} onChange={(e) => setF({ ...f, item_description: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={save}>Save schedule</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
