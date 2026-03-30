import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, FileText, Package, BarChart3, Pencil, MapPin, Users, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Nonprofit, NonprofitLocation, FoodListing, ImpactReport, ApprovalStatus } from "@/types/database";
import AddOrganizationUserDialog from "@/components/invitations/AddOrganizationUserDialog";
import AddLocationUserDialog from "@/components/invitations/AddLocationUserDialog";
import AddNonprofitLocationDialog from "@/components/invitations/AddNonprofitLocationDialog";
import JoinCodeDisplay from "@/components/invitations/JoinCodeDisplay";

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-chart-4/15 text-chart-4",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  deactivated: "bg-muted text-muted-foreground",
};

export default function NonprofitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<Nonprofit>>({});
  const [orgUserDialogOpen, setOrgUserDialogOpen] = useState(false);
  const [locUserDialogOpen, setLocUserDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [addLocationOpen, setAddLocationOpen] = useState(false);

  const { data: np } = useQuery({
    queryKey: ["nonprofit", id],
    queryFn: async () => { const { data, error } = await supabase.from("nonprofits").select("*").eq("id", id!).single(); if (error) throw error; return data as Nonprofit; },
    enabled: !!id,
  });

  const { data: npJoinCode } = useQuery({
    queryKey: ["np-join-code", id],
    queryFn: async () => { const { data } = await supabase.rpc("get_nonprofit_join_code", { _nonprofit_id: id! }); return data as string | null; },
    enabled: !!id,
  });

  const { data: npLocations = [] } = useQuery({
    queryKey: ["np-locations", id],
    queryFn: async () => { const { data, error } = await supabase.from("nonprofit_locations").select("*").eq("nonprofit_id", id!).order("created_at", { ascending: false }); if (error) throw error; return data as NonprofitLocation[]; },
    enabled: !!id,
  });

  const { data: npUsers = [] } = useQuery({
    queryKey: ["np-users", id],
    queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").eq("nonprofit_id", id!); if (error) throw error; return data as any[]; },
    enabled: !!id,
  });

  const { data: claimedListings = [] } = useQuery({
    queryKey: ["np-listings", id],
    queryFn: async () => { const { data, error } = await supabase.from("food_listings").select("*").eq("nonprofit_claimed_id", id!).order("created_at", { ascending: false }); if (error) throw error; return data as FoodListing[]; },
    enabled: !!id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["np-reports", id],
    queryFn: async () => { const { data, error } = await supabase.from("impact_reports").select("*").eq("nonprofit_id", id!).order("created_at", { ascending: false }); if (error) throw error; return data as ImpactReport[]; },
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ApprovalStatus) => { const { error } = await supabase.from("nonprofits").update({ approval_status: status }).eq("id", id!); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nonprofit", id] }); toast.success("Status updated"); },
  });

  const updateNp = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("nonprofits").update(form).eq("id", id!); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nonprofit", id] }); toast.success("Nonprofit updated"); setEditOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = () => {
    if (!np) return;
    setForm({
      organization_name: np.organization_name, ein: np.ein, website: np.website,
      primary_contact: np.primary_contact, address: np.address, city: np.city, state: np.state,
      zip: np.zip, county: np.county, operating_hours: np.operating_hours,
      cold_storage: np.cold_storage, refrigeration: np.refrigeration, cabinetry: np.cabinetry,
      population_served: np.population_served, estimated_weekly_served: np.estimated_weekly_served,
    });
    setEditOpen(true);
  };

  const openAddLocUser = (locId: string) => {
    setSelectedLocationId(locId);
    setLocUserDialogOpen(true);
  };

  if (!np) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  // Component for document viewing with signed URLs
  function NonprofitDocuments({ np }: { np: Nonprofit }) {
    const [insUrl, setInsUrl] = useState<string | null>(null);
    const [agrUrl, setAgrUrl] = useState<string | null>(null);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const loadSignedUrls = async () => {
      setLoadingDocs(true);
      try {
        const urls: { ins?: string; agr?: string } = {};
        if (np.proof_of_insurance_url) {
          const { data } = await supabase.storage.from("nonprofit-documents").createSignedUrl(np.proof_of_insurance_url, 300);
          if (data?.signedUrl) urls.ins = data.signedUrl;
        }
        if (np.signed_agreement_url) {
          const { data } = await supabase.storage.from("nonprofit-documents").createSignedUrl(np.signed_agreement_url, 300);
          if (data?.signedUrl) urls.agr = data.signedUrl;
        }
        setInsUrl(urls.ins || null);
        setAgrUrl(urls.agr || null);
      } catch {
        toast.error("Failed to load document URLs");
      } finally {
        setLoadingDocs(false);
      }
    };

    return (
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><FileText className="w-5 h-5" />Documents</h2>
        {!insUrl && !agrUrl && (np.proof_of_insurance_url || np.signed_agreement_url) && (
          <Button size="sm" variant="outline" onClick={loadSignedUrls} disabled={loadingDocs} className="mb-4">
            {loadingDocs ? "Loading..." : "Load Secure Documents"}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Proof of Insurance</p>
            {insUrl ? <a href={insUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline mt-1 inline-block">View Document (expires in 5 min)</a>
              : np.proof_of_insurance_url ? <p className="text-sm text-muted-foreground mt-1">Click "Load Secure Documents" to view</p>
              : <p className="text-sm text-muted-foreground mt-1">Not uploaded</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Signed Agreement</p>
            {agrUrl ? <a href={agrUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline mt-1 inline-block">View Document (expires in 5 min)</a>
              : np.signed_agreement_url ? <p className="text-sm text-muted-foreground mt-1">Click "Load Secure Documents" to view</p>
              : <p className="text-sm text-muted-foreground mt-1">Not uploaded</p>}
          </div>
        </div>
      </section>
    );
  }

  const totalPounds = claimedListings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/nonprofits")}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{np.organization_name}</h1>
          <p className="text-sm text-muted-foreground">Nonprofit Partner</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
          {np.approval_status !== "approved" && <Button size="sm" onClick={() => updateStatus.mutate("approved")} className="bg-success hover:bg-success/90 text-success-foreground">Approve</Button>}
          {np.approval_status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate("rejected")}>Reject</Button>}
          {np.approval_status !== "deactivated" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("deactivated")}>Deactivate</Button>}
        </div>
      </div>

      {/* Join Code */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Nonprofit Location Join Code</h2>
        <JoinCodeDisplay code={npJoinCode ?? null} entityId={np.id} entityType="nonprofit" invalidateKey={["np-join-code", id!]} />
        <p className="text-xs text-muted-foreground mt-2">Share this code with distribution location operators so they can join your nonprofit during signup.</p>
      </section>

      {/* Profile */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Heart className="w-5 h-5" />Organization Profile</h2>
        <div className="flex gap-6">
          {np.logo_url && <img src={np.logo_url} alt={np.organization_name} className="w-20 h-20 rounded-lg object-cover" />}
          <div className="grid grid-cols-3 gap-6 flex-1">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p><p className="text-sm font-medium text-foreground mt-1">{np.organization_name}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">EIN</p><p className="text-sm text-foreground mt-1">{np.ein || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Website</p><p className="text-sm text-foreground mt-1">{np.website || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Primary Contact</p><p className="text-sm text-foreground mt-1">{np.primary_contact || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground mt-1">{[np.address, np.city, np.state, np.zip].filter(Boolean).join(", ") || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">County</p><p className="text-sm text-foreground mt-1">{np.county || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Operating Hours</p><p className="text-sm text-foreground mt-1">{np.operating_hours || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p><span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[np.approval_status]}`}>{np.approval_status}</span></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Date Applied</p><p className="text-sm text-foreground mt-1">{new Date(np.created_at).toLocaleDateString()}</p></div>
          </div>
        </div>
      </section>

      {/* Distribution Locations */}
      <section className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><MapPin className="w-5 h-5" />Distribution Locations ({npLocations.length})</h2>
          <Button size="sm" onClick={() => setAddLocationOpen(true)}><Plus className="w-4 h-4 mr-1" />Add Location</Button>
        </div>
        {npLocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No distribution locations added yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {npLocations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell>{[loc.address, loc.city, loc.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>{loc.operating_hours || "—"}</TableCell>
                  <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[loc.approval_status]}`}>{loc.approval_status}</span></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openAddLocUser(loc.id)}><UserPlus className="w-3 h-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Organization Users */}
      <section className="bg-card rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5" />Organization Users ({npUsers.length})</h2>
          <Button size="sm" onClick={() => setOrgUserDialogOpen(true)}><UserPlus className="w-4 h-4 mr-1" />Add Organization User</Button>
        </div>
        {npUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users associated.</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>First Name</TableHead><TableHead>Last Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
            <TableBody>
              {npUsers.map((u: any) => (
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

      {/* Capacity */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Capacity & Capabilities</h2>
        <div className="grid grid-cols-3 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Cold Storage</p><p className="text-sm text-foreground mt-1">{np.cold_storage ? "Yes" : "No"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Refrigeration</p><p className="text-sm text-foreground mt-1">{np.refrigeration ? "Yes" : "No"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Cabinetry</p><p className="text-sm text-foreground mt-1">{np.cabinetry ? "Yes" : "No"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Food Types Accepted</p><p className="text-sm text-foreground mt-1">{np.food_types_accepted?.map(t => t.replace(/_/g, " ")).join(", ") || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Served</p><p className="text-sm text-foreground mt-1">{np.estimated_weekly_served || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Population Served</p><p className="text-sm text-foreground mt-1">{np.population_served || "—"}</p></div>
        </div>
      </section>

      {/* Documents */}
      <NonprofitDocuments np={np} />

      {/* Impact Summary */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" />Impact Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Donations Claimed</p><p className="text-2xl font-bold text-foreground mt-1">{claimedListings.length}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Meals Served</p><p className="text-2xl font-bold text-foreground mt-1">{totalMeals.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Pounds Received</p><p className="text-2xl font-bold text-foreground mt-1">{totalPounds.toLocaleString()}</p></div>
        </div>
      </section>

      {/* Claim History */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Package className="w-5 h-5" />Donation Claim History ({claimedListings.length})</h2>
        {claimedListings.length === 0 ? <p className="text-sm text-muted-foreground">No donations claimed yet.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Food Type</TableHead><TableHead>Pounds</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {claimedListings.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/donations/${l.id}`)}>
                  <TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                  <TableCell>{l.pounds || "—"}</TableCell>
                  <TableCell className="capitalize">{l.status.replace(/_/g, " ")}</TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Nonprofit</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Organization Name *</Label><Input value={(form.organization_name as string) || ""} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>EIN</Label><Input value={(form.ein as string) || ""} onChange={(e) => setForm({ ...form, ein: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={(form.website as string) || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <div><Label>Primary Contact</Label><Input value={(form.primary_contact as string) || ""} onChange={(e) => setForm({ ...form, primary_contact: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={(form.address as string) || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={(form.city as string) || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={(form.state as string) || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div><Label>ZIP</Label><Input value={(form.zip as string) || ""} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div><Label>Operating Hours</Label><Input value={(form.operating_hours as string) || ""} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} /></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.cold_storage} onCheckedChange={(v) => setForm({ ...form, cold_storage: !!v })} />Cold Storage</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.refrigeration} onCheckedChange={(v) => setForm({ ...form, refrigeration: !!v })} />Refrigeration</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.cabinetry} onCheckedChange={(v) => setForm({ ...form, cabinetry: !!v })} />Cabinetry</label>
            </div>
            <div><Label>Population Served</Label><Input value={(form.population_served as string) || ""} onChange={(e) => setForm({ ...form, population_served: e.target.value })} /></div>
            <Button className="w-full" onClick={() => updateNp.mutate()} disabled={!form.organization_name || updateNp.isPending}>
              {updateNp.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitation Dialogs */}
      <AddOrganizationUserDialog
        open={orgUserDialogOpen}
        onOpenChange={setOrgUserDialogOpen}
        organizationId={id!}
        organizationType="nonprofit"
        organizationName={np?.organization_name || "Organization"}
        invalidateKey={["np-users", id!]}
      />

      {selectedLocationId && (
        <AddLocationUserDialog
          open={locUserDialogOpen}
          onOpenChange={(v) => { setLocUserDialogOpen(v); if (!v) setSelectedLocationId(null); }}
          locationId={selectedLocationId}
          locationType="nonprofit"
          locationName={npLocations.find(l => l.id === selectedLocationId)?.name || "Location"}
          invalidateKey={["np-users", id!]}
        />
      )}

      <AddNonprofitLocationDialog
        open={addLocationOpen}
        onOpenChange={setAddLocationOpen}
        nonprofitId={id!}
        nonprofitName={np?.organization_name || "Organization"}
        invalidateKey={["np-locations", id!]}
      />
    </div>
  );
}
