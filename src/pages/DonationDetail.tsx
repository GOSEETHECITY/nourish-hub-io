import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { FoodListing, Organization, Location, Nonprofit, ImpactReport, ListingStatus } from "@/types/database";

const STATUSES: ListingStatus[] = ["posted", "claimed", "picked_up", "pending_impact_report", "completed", "cancelled"];

export default function DonationDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: listing } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("id", listingId!).single();
      if (error) throw error;
      return data as FoodListing;
    },
    enabled: !!listingId,
  });

  const { data: org } = useQuery({
    queryKey: ["org-for-listing", listing?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("*").eq("id", listing!.organization_id).single();
      return data as Organization;
    },
    enabled: !!listing?.organization_id,
  });

  const { data: loc } = useQuery({
    queryKey: ["loc-for-listing", listing?.location_id],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("*").eq("id", listing!.location_id).single();
      return data as Location;
    },
    enabled: !!listing?.location_id,
  });

  const { data: nonprofit } = useQuery({
    queryKey: ["nonprofit-for-listing", listing?.nonprofit_claimed_id],
    queryFn: async () => {
      const { data } = await supabase.from("nonprofits").select("*").eq("id", listing!.nonprofit_claimed_id!).single();
      return data as Nonprofit;
    },
    enabled: !!listing?.nonprofit_claimed_id,
  });

  const { data: report } = useQuery({
    queryKey: ["report-for-listing", listingId],
    queryFn: async () => {
      const { data } = await supabase.from("impact_reports").select("*").eq("food_listing_id", listingId!).maybeSingle();
      return data as ImpactReport | null;
    },
    enabled: !!listingId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ListingStatus) => {
      const { error } = await supabase.from("food_listings").update({ status }).eq("id", listingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      toast.success("Status updated");
    },
  });

  if (!listing) return <div className="p-12 text-center text-muted-foreground">Loading...</div>;

  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-2xl font-bold text-foreground">Donation Detail</h1>
      </div>

      <div className="bg-card rounded-xl border p-6 space-y-6">
        {/* Photos */}
        {listing.photo_urls && listing.photo_urls.length > 0 && (
          <div className="flex gap-4 overflow-x-auto">
            {listing.photo_urls.map((url, i) => (
              <img key={i} src={url} alt={`Donation photo ${i + 1}`} className="w-48 h-36 rounded-lg object-cover" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Organization</p><p className="text-sm font-medium text-foreground mt-1">{org?.name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p><p className="text-sm text-foreground mt-1">{loc?.name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Food Type</p><p className="text-sm text-foreground mt-1 capitalize">{listing.food_type?.replace(/_/g, " ") || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pounds</p><p className="text-sm text-foreground mt-1">{listing.pounds || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Donation Value</p><p className="text-sm text-foreground mt-1">{listing.estimated_donation_value ? `$${listing.estimated_donation_value.toFixed(2)}` : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Window</p><p className="text-sm text-foreground mt-1">{listing.pickup_window_start ? `${new Date(listing.pickup_window_start).toLocaleString()} – ${listing.pickup_window_end ? new Date(listing.pickup_window_end).toLocaleString() : ""}` : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pickup Address</p><p className="text-sm text-foreground mt-1">{listing.pickup_address || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Notes</p><p className="text-sm text-foreground mt-1">{listing.notes || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Date Posted</p><p className="text-sm text-foreground mt-1">{new Date(listing.created_at).toLocaleString()}</p></div>
        </div>

        {/* Status override */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <p className="text-sm font-medium text-foreground">Status:</p>
          <Select value={listing.status} onValueChange={(v) => updateStatus.mutate(v as ListingStatus)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Nonprofit Info */}
      {nonprofit && (
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Claimed by Nonprofit</h2>
          <div className="grid grid-cols-3 gap-6">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Organization</p><p className="text-sm font-medium text-foreground mt-1">{nonprofit.organization_name}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Primary Contact</p><p className="text-sm text-foreground mt-1">{nonprofit.primary_contact || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Address</p><p className="text-sm text-foreground mt-1">{[nonprofit.address, nonprofit.city, nonprofit.state].filter(Boolean).join(", ") || "—"}</p></div>
          </div>
        </div>
      )}

      {/* Impact Report */}
      {report && (
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Impact Report</h2>
          <div className="grid grid-cols-3 gap-6">
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Meals Served</p><p className="text-sm font-medium text-foreground mt-1">{report.meals_served || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Date Distributed</p><p className="text-sm text-foreground mt-1">{report.date_distributed ? new Date(report.date_distributed).toLocaleDateString() : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Notes</p><p className="text-sm text-foreground mt-1">{report.notes || "—"}</p></div>
          </div>
          {report.photo_url && <img src={report.photo_url} alt="Impact report" className="mt-4 w-48 h-36 rounded-lg object-cover" />}
        </div>
      )}
    </div>
  );
}
