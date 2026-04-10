import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { FoodListing } from "@/types/database";

// Nonprofits use this page to track the donations they have claimed and to
// advance them through the lifecycle:
//   claimed → picked_up → pending_impact_report → completed
// Historically this view had no action buttons, so claimed donations could
// never be moved forward and the product's core flow was broken. This file
// adds inline "Mark Picked Up" and "Submit Impact Report" actions.
export default function NonprofitClaimed() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [reportListing, setReportListing] = useState<FoodListing | null>(null);
  const [form, setForm] = useState({ meals_served: "", date_distributed: "", notes: "" });

  const { data: claimed = [] } = useQuery({
    queryKey: ["my-claims", profile?.nonprofit_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .eq("nonprofit_claimed_id", profile!.nonprofit_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
    enabled: !!profile?.nonprofit_id,
  });

  const orgIds = useMemo(() => [...new Set(claimed.map((l) => l.organization_id))], [claimed]);
  const { data: orgs = [] } = useQuery({
    queryKey: ["np-claim-orgs", orgIds],
    queryFn: async () => {
      if (!orgIds.length) return [];
      const { data } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      return data || [];
    },
    enabled: orgIds.length > 0,
  });
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o: any) => [o.id, o.name])), [orgs]);
  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  const markPickedUp = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase
        .from("food_listings")
        .update({ status: "picked_up" as const })
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-for-report"] });
      toast.success("Marked as picked up");
    },
    onError: (e: any) => toast.error(e.message || "Could not update status"),
  });

  const submitReport = useMutation({
    mutationFn: async () => {
      if (!profile?.nonprofit_id || !reportListing) throw new Error("Missing data");
      const { error: insertError } = await supabase.from("impact_reports").insert({
        food_listing_id: reportListing.id,
        nonprofit_id: profile.nonprofit_id,
        meals_served: form.meals_served ? Number(form.meals_served) : null,
        date_distributed: form.date_distributed || null,
        notes: form.notes || null,
      });
      if (insertError) throw insertError;
      const { error: updateError } = await supabase
        .from("food_listings")
        .update({ status: "completed" as const })
        .eq("id", reportListing.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      queryClient.invalidateQueries({ queryKey: ["my-reports"] });
      queryClient.invalidateQueries({ queryKey: ["eligible-for-report"] });
      toast.success("Impact report submitted — donation marked complete");
      setReportListing(null);
      setForm({ meals_served: "", date_distributed: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message || "Could not submit report"),
  });

  const cancelClaim = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase
        .from("food_listings")
        .update({ status: "posted" as const, nonprofit_claimed_id: null })
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      queryClient.invalidateQueries({ queryKey: ["available-donations"] });
      toast.success("Claim released — donation is available again");
    },
    onError: (e: any) => toast.error(e.message || "Could not release claim"),
  });

  const statusClass = (s: string) => {
    if (s === "completed") return "bg-success/15 text-success";
    if (s === "picked_up" || s === "pending_impact_report") return "bg-primary/15 text-primary";
    return "bg-chart-4/15 text-chart-4";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Claimed Donations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track the donations you have claimed and advance them through pickup and impact reporting.
        </p>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Food Type</TableHead>
              <TableHead>Pounds</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claimed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  You haven't claimed any donations yet.
                </TableCell>
              </TableRow>
            ) : claimed.map((d) => {
              const isClaimed = d.status === "claimed";
              const isPickedUp = d.status === "picked_up" || d.status === "pending_impact_report";
              const isCompleted = d.status === "completed";
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{orgMap[d.organization_id] || "—"}</TableCell>
                  <TableCell className="capitalize">{d.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                  <TableCell>{d.pounds || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${statusClass(d.status)}`}>
                      {formatStatus(d.status)}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end flex-wrap">
                      {isClaimed && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPickedUp.mutate(d.id)}
                            disabled={markPickedUp.isPending}
                          >
                            Mark Picked Up
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelClaim.mutate(d.id)}
                            disabled={cancelClaim.isPending}
                          >
                            Release
                          </Button>
                        </>
                      )}
                      {isPickedUp && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setReportListing(d);
                            setForm({ meals_served: "", date_distributed: "", notes: "" });
                          }}
                        >
                          Submit Impact Report
                        </Button>
                      )}
                      {isCompleted && (
                        <span className="text-xs text-muted-foreground">Completed</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!reportListing} onOpenChange={(open) => !open && setReportListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Impact Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {reportListing && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{orgMap[reportListing.organization_id] || "—"}</span>{" "}
                — {reportListing.food_type?.replace(/_/g, " ")} ({reportListing.pounds || 0} lbs)
              </div>
            )}
            <div>
              <Label>Meals Served</Label>
              <Input
                type="number"
                value={form.meals_served}
                onChange={(e) => setForm({ ...form, meals_served: e.target.value })}
              />
            </div>
            <div>
              <Label>Date Distributed</Label>
              <Input
                type="date"
                value={form.date_distributed}
                onChange={(e) => setForm({ ...form, date_distributed: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => submitReport.mutate()}
              disabled={submitReport.isPending}
            >
              {submitReport.isPending ? "Submitting..." : "Submit & Mark Completed"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
