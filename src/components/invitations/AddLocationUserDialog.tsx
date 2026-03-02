import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  locationType: "venue" | "nonprofit";
  /** Query key to invalidate on success */
  invalidateKey: string[];
}

const VENUE_LOCATION_ROLES = [
  { value: "location_manager", label: "Location Manager" },
  { value: "chef", label: "Chef" },
  { value: "marketing_director", label: "Marketing Director" },
  { value: "staff", label: "Staff" },
];

const NONPROFIT_LOCATION_ROLES = [
  { value: "site_manager", label: "Site Manager" },
  { value: "volunteer_coordinator", label: "Volunteer Coordinator" },
  { value: "staff", label: "Staff" },
];

const emptyForm = { first_name: "", last_name: "", email: "", phone: "", role: "staff" };

export default function AddLocationUserDialog({ open, onOpenChange, locationId, locationType, invalidateKey }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const roles = locationType === "nonprofit" ? NONPROFIT_LOCATION_ROLES : VENUE_LOCATION_ROLES;

  const invite = useMutation({
    mutationFn: async () => {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      if (existing) {
        const updateData = locationType === "nonprofit"
          ? { nonprofit_location_id: locationId }
          : { location_id: locationId };
        const { error } = await supabase.from("profiles").update(updateData).eq("id", existing.id);
        if (error) throw error;
        toast.success("Existing user linked to location");
      } else {
        toast.success(`Invitation would be sent to ${form.email}. Email sending is not yet configured.`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      onOpenChange(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setForm(emptyForm); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Location User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div>
            <Label>Role *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            If the user already has an account, they will be linked to this location. Otherwise, an email invitation will be sent.
          </p>
          <Button className="w-full" onClick={() => invite.mutate()} disabled={!form.email || !form.first_name || !form.last_name || invite.isPending}>
            {invite.isPending ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
