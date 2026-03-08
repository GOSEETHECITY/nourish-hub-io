import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { LOCATION_TYPES } from "@/lib/constants";
import AddLocationUserDialog from "@/components/invitations/AddLocationUserDialog";
import type { Location, Profile } from "@/types/database";

const emptyForm = {
  name: "", location_type: "", address: "", city: "", state: "", zip: "", county: "",
  different_pickup: false, pickup_address: "", pickup_instructions: "",
  hours_of_operation: "", estimated_surplus_frequency: "",
};

export default function VenueLocations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [locUserDialogOpen, setLocUserDialogOpen] = useState(false);
  const [detailLocId, setDetailLocId] = useState<string | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: locationUsers = [] } = useQuery({
    queryKey: ["venue-loc-users", detailLocId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("location_id", detailLocId!);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!detailLocId,
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      if (!profile?.organization_id) throw new Error("No organization");
      const pickupAddr = form.different_pickup
        ? form.pickup_address
        : [form.address, form.city, form.state].filter(Boolean).join(", ");
      const { error } = await supabase.from("locations").insert({
        organization_id: profile.organization_id,
        name: form.name, location_type: form.location_type || null,
        address: form.address, city: form.city, state: form.state,
        zip: form.zip, county: form.county, pickup_address: pickupAddr,
        pickup_instructions: form.pickup_instructions,
        hours_of_operation: form.hours_of_operation,
        estimated_surplus_frequency: form.estimated_surplus_frequency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venue-locations"] });
      toast.success("Location added!");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const detailLoc = locations.find((l) => l.id === detailLocId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all locations under your organization</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Location
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No locations added yet — click "Add Location" to get started.</TableCell></TableRow>
            ) : locations.map((l) => (
              <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailLocId(l.id)}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{(l as any).location_type || "—"}</TableCell>
                <TableCell>{l.address || "—"}</TableCell>
                <TableCell>{l.city || "—"}</TableCell>
                <TableCell>{l.state || "—"}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${l.approval_status === "approved" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{l.approval_status}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Location Detail Dialog */}
      <Dialog open={!!detailLocId} onOpenChange={(open) => { if (!open) setDetailLocId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detailLoc?.name || "Location Details"}</DialogTitle></DialogHeader>
          {detailLoc && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase">Type</p><p className="text-sm text-foreground mt-1">{(detailLoc as any).location_type || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Address</p><p className="text-sm text-foreground mt-1">{[detailLoc.address, detailLoc.city, detailLoc.state, detailLoc.zip].filter(Boolean).join(", ")}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">County</p><p className="text-sm text-foreground mt-1">{detailLoc.county || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Pickup Address</p><p className="text-sm text-foreground mt-1">{detailLoc.pickup_address || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Hours</p><p className="text-sm text-foreground mt-1">{detailLoc.hours_of_operation || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase">Surplus Frequency</p><p className="text-sm text-foreground mt-1">{detailLoc.estimated_surplus_frequency || "—"}</p></div>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">Location Users ({locationUsers.length})</h3>
                  <Button size="sm" onClick={() => { setSelectedLocId(detailLoc.id); setLocUserDialogOpen(true); }}>Add User</Button>
                </div>
                {locationUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No users assigned to this location.</p>
                ) : (
                  <div className="space-y-2">
                    {locationUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <p className="text-sm text-foreground">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Location Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Location Type *</Label>
              <Select value={form.location_type} onValueChange={(v) => setForm({ ...form, location_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.different_pickup} onCheckedChange={(v) => setForm({ ...form, different_pickup: !!v })} />
              My pickup address is different from my location address
            </label>
            {form.different_pickup && <div><Label>Pickup Address</Label><Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} /></div>}
            <div><Label>Pickup Instructions</Label><Input value={form.pickup_instructions} onChange={(e) => setForm({ ...form, pickup_instructions: e.target.value })} /></div>
            <div><Label>Hours of Operation</Label><Input value={form.hours_of_operation} onChange={(e) => setForm({ ...form, hours_of_operation: e.target.value })} /></div>
            <Button className="w-full" onClick={() => createLocation.mutate()} disabled={!form.name || !form.location_type || createLocation.isPending}>
              {createLocation.isPending ? "Adding..." : "Add Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedLocId && (
        <AddLocationUserDialog open={locUserDialogOpen} onOpenChange={setLocUserDialogOpen} locationId={selectedLocId} locationType="venue" locationName={detailLoc?.name || "Location"} invalidateKey={["venue-loc-users", selectedLocId]} />
      )}
    </div>
  );
}
