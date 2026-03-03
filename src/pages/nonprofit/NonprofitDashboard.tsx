import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Package, Heart, BarChart3, CheckCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { FoodListing, ImpactReport, Nonprofit } from "@/types/database";

export default function NonprofitDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportListingId, setReportListingId] = useState<string>("");
  const [reportForm, setReportForm] = useState({ meals_served: "", date_distributed: "", notes: "" });

  // Get nonprofit for this user
  const { data: nonprofit } = useQuery({
    queryKey: ["my-nonprofit", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("*").eq("id", profile!.nonprofit_id!).single();
      if (error) throw error;
      return data as Nonprofit;
    },
    enabled: !!profile?.nonprofit_id,
  });

  // Available donations (posted, unclaimed)
  const { data: available = [] } = useQuery({
    queryKey: ["available-donations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("listing_type", "donation").eq("status", "posted").is("nonprofit_claimed_id", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  // My claimed donations
  const { data: claimed = [] } = useQuery({
    queryKey: ["my-claims", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("nonprofit_claimed_id", profile!.nonprofit_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  // Impact reports
  const { data: reports = [] } = useQuery({
    queryKey: ["my-reports", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_reports").select("*").eq("nonprofit_id", profile!.nonprofit_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ImpactReport[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  // Org names for listings
  const orgIds = useMemo(() => [...new Set([...available, ...claimed].map((l) => l.organization_id))], [available, claimed]);
  const { data: orgs = [] } = useQuery({
    queryKey: ["np-orgs", orgIds],
    queryFn: async () => {
      if (!orgIds.length) return [];
      const { data } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      return data || [];
    },
    enabled: orgIds.length > 0,
  });
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);

  const claimDonation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("food_listings").update({
        nonprofit_claimed_id: profile!.nonprofit_id!,
        status: "claimed" as const,
      }).eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-donations"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast.success("Donation claimed!");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!profile?.nonprofit_id || !reportListingId) throw new Error("Missing data");
      const { error } = await supabase.from("impact_reports").insert({
        food_listing_id: reportListingId,
        nonprofit_id: profile.nonprofit_id,
        meals_served: reportForm.meals_served ? Number(reportForm.meals_served) : null,
        date_distributed: reportForm.date_distributed || null,
        notes: reportForm.notes || null,
      });
      if (error) throw error;
      // Update listing status
      await supabase.from("food_listings").update({ status: "completed" as const }).eq("id", reportListingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reports"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast.success("Impact report submitted!");
      setReportDialogOpen(false);
      setReportForm({ meals_served: "", date_distributed: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const openReport = (listingId: string) => {
    setReportListingId(listingId);
    setReportForm({ meals_served: "", date_distributed: "", notes: "" });
    setReportDialogOpen(true);
  };

  const totalPounds = claimed.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalMeals = reports.reduce((s, r) => s + (r.meals_served || 0), 0);
  const completedCount = claimed.filter((c) => c.status === "completed").length;
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  if (!profile?.nonprofit_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-xl border p-12 text-center max-w-md">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Nonprofit Linked</h2>
          <p className="text-sm text-muted-foreground">Your account is not linked to a nonprofit organization yet. Please contact an admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nonprofit Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{nonprofit?.organization_name || "Loading..."}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Package className="w-4 h-4" />Available Donations</p>
            <p className="text-3xl font-bold text-foreground mt-2">{available.length}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Heart className="w-4 h-4" />Pounds Received</p>
            <p className="text-3xl font-bold text-foreground mt-2">{totalPounds.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="w-4 h-4" />Meals Served</p>
            <p className="text-3xl font-bold text-foreground mt-2">{totalMeals.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4" />Completed</p>
            <p className="text-3xl font-bold text-foreground mt-2">{completedCount}</p>
          </div>
        </div>

        <Tabs defaultValue="available">
          <TabsList>
            <TabsTrigger value="available">Available ({available.length})</TabsTrigger>
            <TabsTrigger value="claimed">My Claims ({claimed.length})</TabsTrigger>
            <TabsTrigger value="reports">Impact Reports ({reports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Food Type</TableHead>
                    <TableHead>Pounds</TableHead>
                    <TableHead>Pickup Window</TableHead>
                    <TableHead>Pickup Address</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {available.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No available donations right now. Check back soon!</TableCell></TableRow>
                  ) : available.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{orgMap[d.organization_id] || "—"}</TableCell>
                      <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                      <TableCell>{d.pounds || "—"}</TableCell>
                      <TableCell>{d.pickup_window_start ? `${new Date(d.pickup_window_start).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{d.pickup_address || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => claimDonation.mutate(d.id)} disabled={claimDonation.isPending}>Claim</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="claimed" className="mt-4">
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Food Type</TableHead>
                    <TableHead>Pounds</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claimed.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">You haven't claimed any donations yet.</TableCell></TableRow>
                  ) : claimed.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{orgMap[d.organization_id] || "—"}</TableCell>
                      <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                      <TableCell>{d.pounds || "—"}</TableCell>
                      <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${d.status === "completed" ? "bg-success/15 text-success" : "bg-chart-4/15 text-chart-4"}`}>{formatStatus(d.status)}</span></TableCell>
                      <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {["claimed", "picked_up", "pending_impact_report"].includes(d.status) && (
                          <Button size="sm" variant="outline" onClick={() => openReport(d.id)}>
                            <Plus className="w-3 h-3 mr-1" />Report
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing ID</TableHead>
                    <TableHead>Meals Served</TableHead>
                    <TableHead>Date Distributed</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No impact reports submitted yet.</TableCell></TableRow>
                  ) : reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.food_listing_id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{r.meals_served || "—"}</TableCell>
                      <TableCell>{r.date_distributed ? new Date(r.date_distributed).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.notes || "—"}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Impact Report Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Impact Report</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Meals Served</Label><Input type="number" value={reportForm.meals_served} onChange={(e) => setReportForm({ ...reportForm, meals_served: e.target.value })} /></div>
              <div><Label>Date Distributed</Label><Input type="date" value={reportForm.date_distributed} onChange={(e) => setReportForm({ ...reportForm, date_distributed: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={reportForm.notes} onChange={(e) => setReportForm({ ...reportForm, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={() => submitReport.mutate()} disabled={submitReport.isPending}>
                {submitReport.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}