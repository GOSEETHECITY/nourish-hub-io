import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { ImpactReport, FoodListing } from "@/types/database";

export default function NonprofitImpactReports() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportListingId, setReportListingId] = useState("");
  const [form, setForm] = useState({ meals_served: "", date_distributed: "", notes: "" });

  const { data: reports = [] } = useQuery({
    queryKey: ["my-reports", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("impact_reports").select("*").eq("nonprofit_id", profile!.nonprofit_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ImpactReport[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  // Eligible listings for impact report (claimed/picked_up/pending)
  const { data: eligibleListings = [] } = useQuery({
    queryKey: ["eligible-for-report", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("id, food_type, pounds, created_at").eq("nonprofit_claimed_id", profile!.nonprofit_id!).in("status", ["claimed", "picked_up", "pending_impact_report"]);
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!profile?.nonprofit_id || !reportListingId) throw new Error("Missing data");
      const { error } = await supabase.from("impact_reports").insert({
        food_listing_id: reportListingId, nonprofit_id: profile.nonprofit_id,
        meals_served: form.meals_served ? Number(form.meals_served) : null,
        date_distributed: form.date_distributed || null, notes: form.notes || null,
      });
      if (error) throw error;
      await supabase.from("food_listings").update({ status: "completed" as const }).eq("id", reportListingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reports"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-for-report"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      toast.success("Impact report submitted!");
      setDialogOpen(false);
      setForm({ meals_served: "", date_distributed: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impact Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">View and submit impact reports for claimed donations</p>
        </div>
        <Button onClick={() => { setForm({ meals_served: "", date_distributed: "", notes: "" }); setReportListingId(""); setDialogOpen(true); }} disabled={eligibleListings.length === 0}>
          <Plus className="w-4 h-4 mr-2" />New Report
        </Button>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Impact Report</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Select Donation *</Label>
              <Select value={reportListingId} onValueChange={setReportListingId}>
                <SelectTrigger><SelectValue placeholder="Choose a claimed donation" /></SelectTrigger>
                <SelectContent>
                  {eligibleListings.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.food_type?.replace(/_/g, " ")} — {l.pounds || 0} lbs ({new Date(l.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Meals Served</Label><Input type="number" value={form.meals_served} onChange={(e) => setForm({ ...form, meals_served: e.target.value })} /></div>
            <div><Label>Date Distributed</Label><Input type="date" value={form.date_distributed} onChange={(e) => setForm({ ...form, date_distributed: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={() => submitReport.mutate()} disabled={!reportListingId || submitReport.isPending}>
              {submitReport.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
