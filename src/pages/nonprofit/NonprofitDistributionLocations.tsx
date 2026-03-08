import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import AddLocationUserDialog from "@/components/invitations/AddNonprofitLocationDialog";
import type { NonprofitLocation } from "@/types/database";

export default function NonprofitDistributionLocations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", zip: "", county: "", operating_hours: "", contact_name: "", contact_email: "", contact_phone: "" });

  const { data: locations = [] } = useQuery({
    queryKey: ["np-locations", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofit_locations").select("*").eq("nonprofit_id", profile!.nonprofit_id!);
      if (error) throw error;
      return data as NonprofitLocation[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      if (!profile?.nonprofit_id) throw new Error("No nonprofit");
      const { error } = await supabase.from("nonprofit_locations").insert({
        nonprofit_id: profile.nonprofit_id, name: form.name,
        address: form.address || null, city: form.city || null, state: form.state || null,
        zip: form.zip || null, county: form.county || null,
        operating_hours: form.operating_hours || null,
        contact_name: form.contact_name || null, contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["np-locations"] });
      toast.success("Distribution location added!");
      setDialogOpen(false);
      setForm({ name: "", address: "", city: "", state: "", zip: "", county: "", operating_hours: "", contact_name: "", contact_email: "", contact_phone: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distribution Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your distribution sites</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Location
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No distribution locations added yet — click "Add Location" to get started.</TableCell></TableRow>
            ) : locations.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.address || "—"}</TableCell>
                <TableCell>{l.city || "—"}</TableCell>
                <TableCell>{l.state || "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${l.approval_status === "approved" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{l.approval_status}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Distribution Location</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Location Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
            <div><Label>Operating Hours</Label><Input value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} /></div>
            <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
              <div><Label>Contact Phone</Label><Input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            </div>
            <Button className="w-full" onClick={() => createLocation.mutate()} disabled={!form.name || createLocation.isPending}>
              {createLocation.isPending ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
