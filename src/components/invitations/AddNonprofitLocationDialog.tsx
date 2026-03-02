import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { FoodType } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nonprofitId: string;
  invalidateKey: string[];
}

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "prepared_meals", label: "Prepared Meals / Cooked Food" },
  { value: "produce", label: "Produce / Fresh Fruits and Vegetables" },
  { value: "dairy", label: "Dairy" },
  { value: "meat_protein", label: "Meat / Protein" },
  { value: "baked_goods", label: "Baked Goods" },
  { value: "shelf_stable", label: "Shelf-Stable / Packaged / Non-Perishable" },
  { value: "frozen", label: "Frozen" },
];

const POPULATIONS = ["Children", "Seniors", "Families", "Homeless Individuals", "Veterans", "Low Income Individuals", "Other"];

const emptyForm = {
  name: "", address: "", city: "", state: "", zip: "", county: "",
  operating_hours: "", pickup_dropoff_instructions: "",
  cold_storage: false, refrigeration: false, cabinetry: false,
  food_types_accepted: [] as FoodType[],
  estimated_weekly_served: "",
  population_served: [] as string[],
  contact_name: "", contact_email: "", contact_phone: "",
};

export default function AddNonprofitLocationDialog({ open, onOpenChange, nonprofitId, invalidateKey }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const toggleFood = (ft: FoodType) => {
    setForm((prev) => ({
      ...prev,
      food_types_accepted: prev.food_types_accepted.includes(ft)
        ? prev.food_types_accepted.filter((f) => f !== ft)
        : [...prev.food_types_accepted, ft],
    }));
  };

  const togglePop = (p: string) => {
    setForm((prev) => ({
      ...prev,
      population_served: prev.population_served.includes(p)
        ? prev.population_served.filter((x) => x !== p)
        : [...prev.population_served, p],
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("nonprofit_locations").insert({
        nonprofit_id: nonprofitId,
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        county: form.county || null,
        operating_hours: form.operating_hours || null,
        pickup_dropoff_instructions: form.pickup_dropoff_instructions || null,
        cold_storage: form.cold_storage,
        refrigeration: form.refrigeration,
        cabinetry: form.cabinetry,
        food_types_accepted: form.food_types_accepted.length ? form.food_types_accepted : null,
        estimated_weekly_served: form.estimated_weekly_served ? parseInt(form.estimated_weekly_served) : null,
        population_served: form.population_served.length ? form.population_served.join(", ") : null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      });
      if (error) throw error;

      // Stub: send email to contact_email
      if (form.contact_email) {
        toast.info(`Invitation would be sent to ${form.contact_email}. Email sending is not yet configured.`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      toast.success("Distribution location added");
      onOpenChange(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm(emptyForm); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Distribution Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div><Label>Location Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Northside Food Pantry" /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
          </div>
          <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
          <div><Label>Operating Hours</Label><Input value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} /></div>
          <div><Label>Pickup/Dropoff Instructions</Label><Input value={form.pickup_dropoff_instructions} onChange={(e) => setForm({ ...form, pickup_dropoff_instructions: e.target.value })} /></div>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Cold Storage</Label><Switch checked={form.cold_storage} onCheckedChange={(v) => setForm({ ...form, cold_storage: v })} /></div>
            <div className="flex items-center justify-between"><Label>Refrigeration</Label><Switch checked={form.refrigeration} onCheckedChange={(v) => setForm({ ...form, refrigeration: v })} /></div>
            <div className="flex items-center justify-between"><Label>Cabinetry</Label><Switch checked={form.cabinetry} onCheckedChange={(v) => setForm({ ...form, cabinetry: v })} /></div>
          </div>

          <div>
            <Label>Food Types Accepted</Label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {FOOD_TYPES.map((ft) => (
                <label key={ft.value} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.food_types_accepted.includes(ft.value)} onCheckedChange={() => toggleFood(ft.value)} />
                  {ft.label}
                </label>
              ))}
            </div>
          </div>

          <div><Label>Estimated Weekly Served</Label><Input type="number" value={form.estimated_weekly_served} onChange={(e) => setForm({ ...form, estimated_weekly_served: e.target.value })} /></div>

          <div>
            <Label>Population Served</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {POPULATIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.population_served.includes(p)} onCheckedChange={() => togglePop(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-foreground mb-3">Location Contact Person</p>
            <div className="space-y-3">
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            </div>
          </div>

          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
            {save.isPending ? "Adding..." : "Add Location"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
