import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, FileText, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Nonprofit, FoodListing, ImpactReport, ApprovalStatus } from "@/types/database";

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

  const { data: np } = useQuery({
    queryKey: ["nonprofit", id],
    queryFn: async () => { const { data, error } = await supabase.from("nonprofits").select("*").eq("id", id!).single(); if (error) throw error; return data as Nonprofit; },
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

  if (!np) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

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
          {np.approval_status !== "approved" && <Button size="sm" onClick={() => updateStatus.mutate("approved")} className="bg-success hover:bg-success/90 text-success-foreground">Approve</Button>}
          {np.approval_status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate("rejected")}>Reject</Button>}
          {np.approval_status !== "deactivated" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("deactivated")}>Deactivate</Button>}
        </div>
      </div>

      {/* Section 1 - Profile */}
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

      {/* Section 2 - Capacity */}
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

      {/* Section 3 - Documents */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><FileText className="w-5 h-5" />Documents</h2>
        <div className="grid grid-cols-2 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Proof of Insurance</p>{np.proof_of_insurance_url ? <a href={np.proof_of_insurance_url} target="_blank" className="text-sm text-accent underline mt-1 inline-block">View Document</a> : <p className="text-sm text-muted-foreground mt-1">Not uploaded</p>}</div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Signed Agreement</p>{np.signed_agreement_url ? <a href={np.signed_agreement_url} target="_blank" className="text-sm text-accent underline mt-1 inline-block">View Document</a> : <p className="text-sm text-muted-foreground mt-1">Not uploaded</p>}</div>
        </div>
      </section>

      {/* Section 4 - Claim History */}
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

      {/* Section 5 - Impact Reports */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Impact Reports ({reports.length})</h2>
        {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports submitted.</p> : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-muted/50 rounded-lg grid grid-cols-4 gap-4">
                <div><p className="text-xs text-muted-foreground">Meals Served</p><p className="text-sm font-medium text-foreground mt-1">{r.meals_served || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Date Distributed</p><p className="text-sm text-foreground mt-1">{r.date_distributed ? new Date(r.date_distributed).toLocaleDateString() : "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm text-foreground mt-1">{r.notes || "—"}</p></div>
                {r.photo_url && <img src={r.photo_url} alt="Impact" className="w-16 h-16 rounded object-cover" />}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 6 - Impact Summary */}
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5" />Impact Summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Donations Claimed</p><p className="text-2xl font-bold text-foreground mt-1">{claimedListings.length}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Meals Served</p><p className="text-2xl font-bold text-foreground mt-1">{totalMeals.toLocaleString()}</p></div>
          <div className="bg-muted/50 rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Pounds Received</p><p className="text-2xl font-bold text-foreground mt-1">{totalPounds.toLocaleString()}</p></div>
        </div>
      </section>
    </div>
  );
}
