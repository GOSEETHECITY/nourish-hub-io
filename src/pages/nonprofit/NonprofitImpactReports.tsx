import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Heart, BarChart3, DollarSign, Leaf, Users, FileDown, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CO2_LBS_PER_LB_FOOD } from "@/lib/co2";
import type { FoodListing } from "@/types/database";

type Range = "week" | "month" | "year" | "all";

function rangeStart(r: Range): Date | null {
  const now = new Date();
  if (r === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (r === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
  if (r === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

const DEMO_KEYS = ["Families", "Homeless individuals", "Women and children", "Youth", "Other"];

export default function NonprofitImpactReports() {
  const { profile } = useAuth();
  const npId = profile?.nonprofit_id;
  const [range, setRange] = useState<Range>("year");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const { data: listings = [] } = useQuery({
    queryKey: ["np-impact-listings", npId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_listings")
        .select("*")
        .eq("nonprofit_claimed_id", npId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FoodListing[];
    },
    enabled: !!npId,
  });

  const listingIds = useMemo(() => listings.map((l) => l.id), [listings]);

  const { data: surveys = [] } = useQuery({
    queryKey: ["np-surveys", npId, listingIds.length],
    queryFn: async () => {
      if (!listingIds.length) return [];
      const { data } = await supabase
        .from("impact_surveys")
        .select("*")
        .eq("nonprofit_id", npId!)
        .not("submitted_at", "is", null);
      return data || [];
    },
    enabled: !!npId && listingIds.length > 0,
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["np-receipts", npId, listingIds.length],
    queryFn: async () => {
      if (!listingIds.length) return [];
      const { data } = await supabase
        .from("tax_receipts")
        .select("food_listing_id, submitted_at")
        .in("food_listing_id", listingIds);
      return data || [];
    },
    enabled: !!npId && listingIds.length > 0,
  });

  const { data: venues = [] } = useQuery({
    queryKey: ["np-venue-orgs", listingIds.length],
    queryFn: async () => {
      const orgIds = Array.from(new Set(listings.map((l) => l.organization_id).filter(Boolean)));
      if (!orgIds.length) return [];
      const { data } = await supabase.from("organizations_public").select("id, name").in("id", orgIds as string[]);
      return data || [];
    },
    enabled: listings.length > 0,
  });
  const venueName = (id: string) => venues.find((v: any) => v.id === id)?.name || "—";
  const receiptSet = new Set(receipts.map((r: any) => r.food_listing_id));

  // Apply date filter (by created_at of donation)
  const start = rangeStart(range);
  const inRange = (d: string | null) => !d || !start || new Date(d) >= start;

  const filteredListings = listings.filter((l) => inRange(l.created_at));
  const filteredSurveys = surveys.filter((s: any) => inRange(s.submitted_at));

  // Stats
  const receivedListings = filteredListings.filter((l) => ["picked_up", "completed"].includes(l.status));
  const totalPounds = receivedListings.reduce((s, l) => s + (l.pounds || 0), 0);
  const totalValue = receivedListings.reduce((s, l) => s + Number(l.estimated_donation_value || 0), 0);
  const donationsCount = receivedListings.length;
  const totalMeals = filteredSurveys.reduce((s: number, x: any) => s + (x.people_fed || 0), 0);
  const co2 = Math.round(totalPounds * CO2_LBS_PER_LB_FOOD);

  // Demographic breakdown across surveys
  const demoCounts: Record<string, number> = Object.fromEntries(DEMO_KEYS.map((k) => [k, 0]));
  for (const s of filteredSurveys as any[]) {
    for (const d of s.demographics || []) if (demoCounts[d] != null) demoCounts[d] += 1;
  }
  const demoData = DEMO_KEYS.map((k) => ({ name: k, count: demoCounts[k] }));

  // Load signed URLs for photo gallery (from impact-survey-photos bucket)
  const allPhotoPaths = useMemo(
    () => (filteredSurveys as any[]).flatMap((s) => (s.photo_urls || []).map((p: string) => ({ id: s.id, path: p }))),
    [filteredSurveys],
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = allPhotoPaths.filter((p) => !photoUrls[p.path]).map((p) => p.path);
      if (!missing.length) return;
      const next: Record<string, string> = {};
      for (const path of missing) {
        const { data } = await supabase.storage.from("impact-survey-photos").createSignedUrl(path, 3600);
        if (data?.signedUrl) next[path] = data.signedUrl;
      }
      if (!cancelled && Object.keys(next).length) setPhotoUrls((prev) => ({ ...prev, ...next }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPhotoPaths.length]);

  const exportCsv = () => {
    const rows = [
      ["Date", "Venue", "Food Type", "Pounds", "Value", "Status", "Receipt Submitted"],
      ...filteredListings.map((l) => [
        new Date(l.created_at).toLocaleDateString(),
        venueName(l.organization_id),
        (l.food_type || "").replace(/_/g, " "),
        String(l.pounds || 0),
        String(l.estimated_donation_value || 0),
        l.status,
        receiptSet.has(l.id) ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `impact-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => window.print();

  const rangeLabel = { week: "This Week", month: "This Month", year: "This Year", all: "All Time" }[range];
  const testimonials = (filteredSurveys as any[]).filter((s) => s.testimonial?.trim());

  return (
    <div className="space-y-6 print:space-y-4">
      <style>{`
        @media print {
          nav, aside, header, button, .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impact Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your donation history and community impact — {rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}><FileDown className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPdf}><Printer className="w-4 h-4 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={<Package />} label="Pounds Received" value={totalPounds.toLocaleString()} />
        <StatCard icon={<Heart />} label="Donations" value={donationsCount.toLocaleString()} />
        <StatCard icon={<Users />} label="Meals Served" value={totalMeals.toLocaleString()} />
        <StatCard icon={<DollarSign />} label="Est. FMV" value={`$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatCard icon={<Leaf />} label="CO₂ Prevented" value={`${co2.toLocaleString()} lbs`} />
      </div>

      <Tabs defaultValue="chart" className="space-y-4">
        <TabsList className="no-print">
          <TabsTrigger value="chart">Demographics</TabsTrigger>
          <TabsTrigger value="history">Donation History</TabsTrigger>
          <TabsTrigger value="surveys">Impact Surveys</TabsTrigger>
          <TabsTrigger value="gallery">Testimonials & Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <div className="bg-card border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" />Demographic Breakdown</h2>
            {filteredSurveys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No survey data yet for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={demoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Food Type</TableHead>
                  <TableHead>Pounds</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No donations in this period.</TableCell></TableRow>
                ) : filteredListings.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{new Date(l.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{venueName(l.organization_id)}</TableCell>
                    <TableCell className="capitalize">{(l.food_type || "").replace(/_/g, " ")}</TableCell>
                    <TableCell>{l.pounds || "—"}</TableCell>
                    <TableCell>{l.estimated_donation_value ? `$${l.estimated_donation_value}` : "—"}</TableCell>
                    <TableCell className="capitalize">{l.status.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      {receiptSet.has(l.id) ? (
                        <span className="text-xs font-medium text-success">Submitted</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="surveys">
          <div className="space-y-3">
            {filteredSurveys.length === 0 ? (
              <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">No submitted surveys in this period.</div>
            ) : (filteredSurveys as any[]).map((s) => (
              <div key={s.id} className="bg-card border rounded-xl p-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Submitted {new Date(s.submitted_at).toLocaleDateString()}</span>
                  <span>{s.food_condition_good ? "Food condition: good" : "Condition issue reported"}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground">People fed: </span><span className="font-semibold">{s.people_fed ?? "—"}</span></div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Demographics: </span>{(s.demographics || []).join(", ") || "—"}</div>
                </div>
                {s.testimonial && <p className="text-sm italic mt-2 border-l-2 border-primary pl-3">"{s.testimonial}"</p>}
                {s.condition_comment && <p className="text-xs text-destructive mt-2">Note: {s.condition_comment}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gallery">
          <div className="space-y-6">
            {testimonials.length > 0 && (
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-semibold mb-3">Testimonials</h3>
                <div className="space-y-3">
                  {testimonials.map((s: any) => (
                    <blockquote key={s.id} className="border-l-2 border-primary pl-3 text-sm italic">
                      "{s.testimonial}"
                      <div className="text-xs not-italic text-muted-foreground mt-1">
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </div>
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border rounded-xl p-5">
              <h3 className="font-semibold mb-3">Photos</h3>
              {allPhotoPaths.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos shared yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allPhotoPaths.map((p, i) => (
                    <div key={`${p.path}-${i}`} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      {photoUrls[p.path] ? (
                        <img src={photoUrls[p.path]} alt="Impact" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
        {label}
      </p>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
    </div>
  );
}
