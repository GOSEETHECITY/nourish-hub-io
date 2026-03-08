import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SustainabilityBaselineForm, { emptySustainabilityBaseline, type SustainabilityBaselineData } from "@/components/forms/SustainabilityBaselineForm";
import type { Location, SustainabilityBaseline } from "@/types/database";

export default function VenueBaseline() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [form, setForm] = useState<SustainabilityBaselineData>(emptySustainabilityBaseline);
  const [editing, setEditing] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      if (data.length > 0 && !selectedLocationId) setSelectedLocationId(data[0].id);
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  const activeLocId = selectedLocationId || locations[0]?.id;

  const { data: baseline } = useQuery({
    queryKey: ["venue-baseline", activeLocId],
    queryFn: async () => {
      const { data, error } = await supabase.from("sustainability_baseline").select("*").eq("location_id", activeLocId!).maybeSingle();
      if (error) throw error;
      return data as SustainabilityBaseline | null;
    },
    enabled: !!activeLocId,
  });

  const saveBaseline = useMutation({
    mutationFn: async () => {
      if (!activeLocId) throw new Error("No location");
      const outcomes = [...form.priority_outcomes];
      if (form.priority_other && outcomes.includes("Other")) outcomes[outcomes.indexOf("Other")] = form.priority_other;
      const payload = {
        location_id: activeLocId,
        generates_surplus: form.generates_surplus,
        estimated_daily_surplus: form.estimated_daily_surplus || null,
        surplus_types: form.surplus_types.length ? form.surplus_types : null,
        current_handling: form.current_handling || null,
        donation_frequency: form.donation_frequency || null,
        priority_outcomes: outcomes.length ? outcomes : null,
      };
      if (baseline) {
        const { error } = await supabase.from("sustainability_baseline").update(payload).eq("id", baseline.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sustainability_baseline").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-baseline", activeLocId] });
      toast.success("Sustainability baseline saved!");
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const startEdit = () => {
    if (baseline) {
      setForm({
        generates_surplus: baseline.generates_surplus,
        estimated_daily_surplus: baseline.estimated_daily_surplus || "",
        surplus_types: baseline.surplus_types || [],
        current_handling: baseline.current_handling || "",
        donation_frequency: baseline.donation_frequency || "",
        priority_outcomes: baseline.priority_outcomes || [],
        priority_other: "",
      });
    } else {
      setForm(emptySustainabilityBaseline);
    }
    setEditing(true);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sustainability Baseline</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete or update the baseline for each location</p>
      </div>

      {locations.length > 1 && (
        <div>
          <Label>Select Location</Label>
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
            <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {!editing && baseline && (
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Current Baseline</h2>
            <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Generates Surplus</p><p className="text-sm text-foreground mt-1">{baseline.generates_surplus ? "Yes" : "No"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Daily Surplus</p><p className="text-sm text-foreground mt-1">{baseline.estimated_daily_surplus || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Surplus Types</p><p className="text-sm text-foreground mt-1">{baseline.surplus_types?.join(", ") || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Current Handling</p><p className="text-sm text-foreground mt-1">{baseline.current_handling || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Donation Frequency</p><p className="text-sm text-foreground mt-1">{baseline.donation_frequency || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Priority Outcomes</p><p className="text-sm text-foreground mt-1">{baseline.priority_outcomes?.join(", ") || "—"}</p></div>
          </div>
        </div>
      )}

      {!editing && !baseline && (
        <div className="bg-card rounded-xl border p-8 text-center space-y-4">
          <p className="text-muted-foreground">No sustainability baseline submitted for this location yet.</p>
          <Button onClick={startEdit}>Complete Baseline</Button>
        </div>
      )}

      {editing && (
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">{baseline ? "Edit Baseline" : "Complete Baseline"}</h2>
          <SustainabilityBaselineForm data={form} onChange={setForm} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => saveBaseline.mutate()} disabled={saveBaseline.isPending}>
              {saveBaseline.isPending ? "Saving..." : "Save Baseline"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
