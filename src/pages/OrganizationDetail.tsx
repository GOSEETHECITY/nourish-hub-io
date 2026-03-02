import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, MapPin, Users, BarChart3, Package, Plus, Pencil, UserPlus } from "lucide-react";
import AddOrganizationUserDialog from "@/components/invitations/AddOrganizationUserDialog";
import AddLocationUserDialog from "@/components/invitations/AddLocationUserDialog";
import JoinCodeDisplay from "@/components/invitations/JoinCodeDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Organization, Location, Profile, FoodListing, SustainabilityBaseline, ApprovalStatus, OrganizationType } from "@/types/database";

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-chart-4/15 text-chart-4",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  deactivated: "bg-muted text-muted-foreground",
};

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "catering_company", label: "Catering Company" },
  { value: "event", label: "Event" },
  { value: "hotel", label: "Hotel" },
  { value: "convention_center", label: "Convention Center" },
  { value: "stadium", label: "Stadium" },
  { value: "arena", label: "Arena" },
  { value: "farm", label: "Farm" },
  { value: "grocery_store", label: "Grocery Store" },
  { value: "food_truck", label: "Food Truck" },
  { value: "airport", label: "Airport" },
  { value: "festival", label: "Festival" },
  { value: "municipal_government", label: "Municipal Government" },
  { value: "county_government", label: "County Government" },
  { value: "state_government", label: "State Government" },
];

const emptyLocationForm = {
  name: "", address: "", city: "", state: "", zip: "", county: "",
  pickup_address: "", pickup_instructions: "", hours_of_operation: "", estimated_surplus_frequency: "",
};

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [orgUserDialogOpen, setOrgUserDialogOpen] = useState(false);
  const [locUserDialogOpen, setLocUserDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [orgForm, setOrgForm] = useState<Partial<Organization>>({});

  const { data: org } = useQuery({
    queryKey: ["organization", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Organization;
    },
    enabled: !!id,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["org-locations", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["org-users", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("organization_id", id!);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!id,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["org-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("organization_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!id,
  });

  const { data: baselines = [] } = useQuery({
    queryKey: ["org-baselines", id],
    queryFn: async () => {
      const locationIds = locations.map((l) => l.id);
      if (!locationIds.length) return [];
      const { data, error } = await supabase.from("sustainability_baseline").select("*").in("location_id", locationIds);
      if (error) throw error;
      return data as SustainabilityBaseline[];
    },
    enabled: locations.length > 0,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ApprovalStatus) => {
      const { error } = await supabase.from("organizations").update({ approval_status: status }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      toast.success("Status updated");
    },
  });

  const updateOrg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organizations").update(orgForm).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
      toast.success("Organization updated");
      setEditOrgOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...locationForm,
        organization_id: id!,
        pickup_address: locationForm.pickup_address || [locationForm.address, locationForm.city, locationForm.state].filter(Boolean).join(", "),
      };
      if (editingLocation) {
        const { error } = await supabase.from("locations").update(payload).eq("id", editingLocation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("locations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-locations", id] });
      queryClient.invalidateQueries({ queryKey: ["location-counts"] });
      toast.success(editingLocation ? "Location updated" : "Location added");
      setLocationDialogOpen(false);
      setEditingLocation(null);
      setLocationForm(emptyLocationForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const openAddLocUser = (locId: string) => {
    setSelectedLocationId(locId);
    setLocUserDialogOpen(true);
  };

  const openEditLocation = (loc: Location) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name, address: loc.address || "", city: loc.city || "", state: loc.state || "",
      zip: loc.zip || "", county: loc.county || "", pickup_address: loc.pickup_address || "",
      pickup_instructions: loc.pickup_instructions || "", hours_of_operation: loc.hours_of_operation || "",
      estimated_surplus_frequency: loc.estimated_surplus_frequency || "",
    });
    setLocationDialogOpen(true);
  };

  const openEditOrg = () => {
    if (!org) return;
    setOrgForm({
      name: org.name, type: org.type,
      primary_contact_name: org.primary_contact_name, primary_contact_email: org.primary_contact_email,
      primary_contact_phone: org.primary_contact_phone, billing_contact: org.billing_contact,
      address: org.address, city: org.city, state: org.state, zip: org.zip, county: org.county,
    });
    setEditOrgOpen(true);
  };

  const totalPounds = listings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalDonations = listings.length;
  const formatType = (t: string) => t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  if (!org) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/organizations")}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
          <p className="text-sm text-muted-foreground">{formatType(org.type)}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openEditOrg}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
          {org.approval_status !== "approved" && <Button size="sm" onClick={() => updateStatus.mutate("approved")} className="bg-success hover:bg-success/90 text-success-foreground">Approve</Button>}
          {org.approval_status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate("rejected")}>Reject</Button>}
          {org.approval_status !== "deactivated" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("deactivated")}>Deactivate</Button>}
        </div>
      </div>

      {/* Section 1 - Organization Profile */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Building2 className="w-5 h-5" />Organization Profile</h2>
        <div className="grid grid-cols-3 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p><p className="text-sm font-medium text-foreground mt-1">{org.name}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Type</p><p className="text-sm font-medium text-foreground mt-1">{formatType(org.type)}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p><span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[org.approval_status]}`}>{org.approval_status}</span></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Contact Name</p><p className="text-sm text-foreground mt-1">{org.primary_contact_name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Contact Email</p><p className="text-sm text-foreground mt-1">{org.primary_contact_email || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Contact Phone</p><p className="text-sm text-foreground mt-1">{org.primary_contact_phone || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Billing Contact</p><p className="text-sm text-foreground mt-1">{org.billing_contact || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground mt-1">{[org.address, org.city, org.state, org.zip].filter(Boolean).join(", ") || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Registered</p><p className="text-sm text-foreground mt-1">{new Date(org.created_at).toLocaleDateString()}</p></div>
        </div>
      </section>

      {/* Join Code */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Location Join Code</h2>
        <JoinCodeDisplay code={org.join_code} entityId={org.id} entityType="organization" invalidateKey={["organization", id!]} />
        <p className="text-xs text-muted-foreground mt-2">Share this code with location operators so they can join your organization during signup.</p>
      </section>

      {/* Section 2 - Onboarding / Sustainability Baseline */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Onboarding Information</h2>
        {baselines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sustainability baseline data submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {baselines.map((b) => (
              <div key={b.id} className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Generates Surplus</p><p className="text-sm text-foreground mt-1">{b.generates_surplus ? "Yes" : "No"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Daily Surplus</p><p className="text-sm text-foreground mt-1">{b.estimated_daily_surplus || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Surplus Types</p><p className="text-sm text-foreground mt-1">{b.surplus_types?.join(", ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Current Handling</p><p className="text-sm text-foreground mt-1">{b.current_handling || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Donation Frequency</p><p className="text-sm text-foreground mt-1">{b.donation_frequency || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Priority Outcomes</p><p className="text-sm text-foreground mt-1">{b.priority_outcomes?.join(", ") || "—"}</p></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3 - Locations */}
      <section className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><MapPin className="w-5 h-5" />Locations ({locations.length})</h2>
          <Button size="sm" onClick={() => { setEditingLocation(null); setLocationForm(emptyLocationForm); setLocationDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Location</Button>
        </div>
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No locations added yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Stripe Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id} className="cursor-pointer" onClick={() => navigate(`/organizations/${id}/locations/${loc.id}`)}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell>{[loc.address, loc.city, loc.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>{loc.county || "—"}</TableCell>
                  <TableCell>{loc.hours_of_operation || "—"}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${loc.marketplace_enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{loc.marketplace_enabled ? "Enabled" : "Disabled"}</span></TableCell>
                  <TableCell>{loc.stripe_onboarding_status || "Not started"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditLocation(loc); }}><Pencil className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openAddLocUser(loc.id); }}><UserPlus className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Section 4 - Users */}
      <section className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5" />Users ({users.length})</h2>
          <Button size="sm" onClick={() => setOrgUserDialogOpen(true)}><UserPlus className="w-4 h-4 mr-1" />Add Organization User</Button>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users associated.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>First Name</TableHead><TableHead>Last Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.first_name || "—"}</TableCell>
                  <TableCell>{u.last_name || "—"}</TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Section 5 - Impact Summary */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" />Impact Summary</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-muted/50 rounded-lg p-5">
            <p className="text-sm text-muted-foreground">Total Pounds Donated</p>
            <p className="text-3xl font-bold text-foreground mt-1">{totalPounds.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">lbs</span></p>
          </div>
          <div className="bg-muted/50 rounded-lg p-5">
            <p className="text-sm text-muted-foreground">Total Donations</p>
            <p className="text-3xl font-bold text-foreground mt-1">{totalDonations}</p>
          </div>
        </div>
      </section>

      {/* Section 6 - Donation History */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Package className="w-5 h-5" />Donation History ({listings.length})</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No donations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Food Type</TableHead>
                <TableHead>Pounds</TableHead>
                <TableHead>Est. Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Posted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/donations/${l.id}`)}>
                  <TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                  <TableCell>{l.pounds || "—"}</TableCell>
                  <TableCell>{l.estimated_donation_value ? `$${l.estimated_donation_value.toFixed(2)}` : "—"}</TableCell>
                  <TableCell><span className="capitalize">{formatStatus(l.status)}</span></TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Add/Edit Location Dialog */}
      <Dialog open={locationDialogOpen} onOpenChange={(open) => { setLocationDialogOpen(open); if (!open) setEditingLocation(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Location Name *</Label><Input value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={locationForm.zip} onChange={(e) => setLocationForm({ ...locationForm, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={locationForm.county} onChange={(e) => setLocationForm({ ...locationForm, county: e.target.value })} /></div>
            <div><Label>Pickup Address</Label><Input value={locationForm.pickup_address} onChange={(e) => setLocationForm({ ...locationForm, pickup_address: e.target.value })} placeholder="Defaults to location address" /></div>
            <div><Label>Pickup Instructions</Label><Input value={locationForm.pickup_instructions} onChange={(e) => setLocationForm({ ...locationForm, pickup_instructions: e.target.value })} /></div>
            <div><Label>Hours of Operation</Label><Input value={locationForm.hours_of_operation} onChange={(e) => setLocationForm({ ...locationForm, hours_of_operation: e.target.value })} /></div>
            <div><Label>Estimated Surplus Frequency</Label><Input value={locationForm.estimated_surplus_frequency} onChange={(e) => setLocationForm({ ...locationForm, estimated_surplus_frequency: e.target.value })} /></div>
            <Button className="w-full" onClick={() => createLocation.mutate()} disabled={!locationForm.name || createLocation.isPending}>
              {createLocation.isPending ? "Saving..." : editingLocation ? "Update Location" : "Add Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Organization User Dialog */}
      <AddOrganizationUserDialog
        open={orgUserDialogOpen}
        onOpenChange={setOrgUserDialogOpen}
        organizationId={id!}
        organizationType="venue"
        invalidateKey={["org-users", id!]}
      />

      {/* Add Location User Dialog */}
      {selectedLocationId && (
        <AddLocationUserDialog
          open={locUserDialogOpen}
          onOpenChange={(v) => { setLocUserDialogOpen(v); if (!v) setSelectedLocationId(null); }}
          locationId={selectedLocationId}
          locationType="venue"
          invalidateKey={["org-users", id!]}
        />
      )}

      {/* Edit Organization Dialog */}
      <Dialog open={editOrgOpen} onOpenChange={setEditOrgOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Organization</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Organization Name *</Label><Input value={orgForm.name || ""} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></div>
            <div>
              <Label>Organization Type *</Label>
              <Select value={orgForm.type || ""} onValueChange={(v) => setOrgForm({ ...orgForm, type: v as OrganizationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORG_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Name</Label><Input value={orgForm.primary_contact_name || ""} onChange={(e) => setOrgForm({ ...orgForm, primary_contact_name: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input value={orgForm.primary_contact_email || ""} onChange={(e) => setOrgForm({ ...orgForm, primary_contact_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contact Phone</Label><Input value={orgForm.primary_contact_phone || ""} onChange={(e) => setOrgForm({ ...orgForm, primary_contact_phone: e.target.value })} /></div>
              <div><Label>Billing Contact</Label><Input value={orgForm.billing_contact || ""} onChange={(e) => setOrgForm({ ...orgForm, billing_contact: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={orgForm.address || ""} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={orgForm.city || ""} onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={orgForm.state || ""} onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={orgForm.zip || ""} onChange={(e) => setOrgForm({ ...orgForm, zip: e.target.value })} /></div>
            </div>
            <div><Label>County</Label><Input value={orgForm.county || ""} onChange={(e) => setOrgForm({ ...orgForm, county: e.target.value })} /></div>
            <Button className="w-full" onClick={() => updateOrg.mutate()} disabled={!orgForm.name || updateOrg.isPending}>
              {updateOrg.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
