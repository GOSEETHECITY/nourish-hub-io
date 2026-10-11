import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { estimateImpact, IMPACT_FACTORS } from "@/lib/impactMethodology";
import { monthlyTrend } from "@/lib/govImpactPdf";
import ImpactMethodologyNote from "@/components/impact/ImpactMethodologyNote";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/** Read-only impact detail for one organization, limited to listings inside the government user's regions. */
export default function GovernmentOrganizationDetail() {
  const { id } = useParams();
  const { data: org } = useQuery({
    queryKey: ["gov-org-detail", id],
    queryFn: async () => (await supabase.from("organizations_public").select("*").eq("id", id!).maybeSingle()).data as any,
    enabled: !!id,
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["gov-region-listings"],
    queryFn: async () => ((await supabase.rpc("gov_region_listings" as any)).data as any[]) || [],
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["gov-region-reports"],
    queryFn: async () => ((await supabase.rpc("gov_region_impact_reports" as any)).data as any[]) || [],
  });
  const mine = useMemo(() => listings.filter((l: any) => l.organization_id === id), [listings, id]);
  const done = mine.filter((l: any) => ["picked_up", "pending_impact_report", "completed"].includes(l.status));
  const ids = new Set(done.map((l: any) => l.id));
  const pounds = done.reduce((s: number, l: any) => s + Number(l.pounds || 0), 0);
  const est = estimateImpact(pounds);
  const meals = reports.filter((r: any) => ids.has(r.food_listing_id)).reduce((s: number, r: any) => s + (r.meals_served || 0), 0);
  const trend = useMemo(() => monthlyTrend(done.map((l: any) => ({ date: l.picked_up_at || l.created_at, pounds: Number(l.pounds || 0) })), IMPACT_FACTORS.MEALS_PER_LB), [done]);

  const metrics = [
    ["Donations completed", done.length.toLocaleString()],
    ["Pounds diverted", `${Math.round(pounds).toLocaleString()} lbs`],
    ["Meals served (reported)", meals.toLocaleString()],
    ["Est. meals rescued", est.meals.toLocaleString()],
    ["Est. CO₂e avoided", `${est.co2Lbs.toLocaleString()} lbs`],
    ["Est. water saved", `${est.waterGal.toLocaleString()} gal`],
    ["Landfill diverted", `${est.landfillLbs.toLocaleString()} lbs`],
  ];

  return (
    <div className="space-y-6">
      <Link to="/government/organizations" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Organizations</Link>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{org?.name || "Organization"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{[org?.city, org?.state].filter(Boolean).join(", ")} · Activity inside your jurisdiction only</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(([l, v]) => (
          <div key={l} className="bg-card rounded-xl border p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="text-2xl font-bold text-foreground mt-2">{v}</p></div>
        ))}
      </div>
      <ImpactMethodologyNote />
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Pounds diverted per month</h2>
        <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="pounds" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>
      </div>
    </div>
  );
}
