import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, MapPin, Users, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Organization, Location, Profile, FoodListing, SustainabilityBaseline, ApprovalStatus } from "@/types/database";

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-chart-4/15 text-chart-4",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  deactivated: "bg-muted text-muted-foreground",
};

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><MapPin className="w-5 h-5" />Locations ({locations.length})</h2>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Section 4 - Users */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><Users className="w-5 h-5" />Users ({users.length})</h2>
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
    </div>
  );
}
