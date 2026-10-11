import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Rocket, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { MARKETPLACE_ELIGIBLE_TYPES } from "@/lib/marketplace";
import type { Coupon, Location } from "@/types/database";

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric" });

export default function VenueMarketplace() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ location_id: "", title: "", description: "", price: "", original_price: "", quantity: "", end: "", donate: false, donateDate: "", donateHour: "21" });

  const { data: locations = [] } = useQuery({
    queryKey: ["venue-locations", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("*").eq("organization_id", profile!.organization_id!);
      if (error) throw error;
      return data as Location[];
    },
    enabled: !!profile?.organization_id,
  });
  const eligibleLocations = useMemo(() => locations.filter((l) => l.marketplace_enabled || MARKETPLACE_ELIGIBLE_TYPES.includes((l as any).location_type || "")), [locations]);

  const { data: cityFlags = [] } = useQuery({
    queryKey: ["surplus-city-flags"],
    queryFn: async () => ((await supabase.from("city_thresholds").select("city, state, surplus_selling_enabled" as any)).data as any[]) || [],
  });
  const sellingLocations = useMemo(() => eligibleLocations.filter((l) => cityFlags.some((c: any) =>
    c.surplus_selling_enabled && String(c.city).toLowerCase() === String(l.city || "").toLowerCase() &&
    (!c.state || String(c.state).toLowerCase() === String(l.state || "").toLowerCase()))), [eligibleLocations, cityFlags]);
  const cityOpen = sellingLocations.length > 0;

  const { data: org } = useQuery({
    queryKey: ["venue-stripe-status", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted").eq("id", profile!.organization_id!).maybeSingle();
      const { data: priv } = await supabase.rpc("get_organization_private" as any, { p_ids: [profile!.organization_id!] });
      return { ...(data as any), started: !!((priv as any[])?.[0]?.stripe_account_id) };
    },
    enabled: !!profile?.organization_id && cityOpen,
  });
  const stripeReady = !!org?.stripe_charges_enabled && !!org?.stripe_payouts_enabled;

  const { data: coupons = [] } = useQuery({
    queryKey: ["venue-coupons", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!profile?.organization_id,
  });

  if (eligibleLocations.length === 0) return null;

  const startStripe = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", { body: {} });
    setBusy(false);
    if (error || !data?.url) return toast.error((data as any)?.error || "Could not start Stripe setup");
    window.location.href = data.url;
  };

  const create = async () => {
    const price = Number(f.price), qty = Math.floor(Number(f.quantity));
    if (!f.title.trim()) return toast.error("Add a title");
    if (!(price > 0)) return toast.error("Enter a price");
    if (!(qty > 0)) return toast.error("Enter a quantity");
    if (!f.end || new Date(f.end) <= new Date()) return toast.error("Sale end must be in the future");
    let donateAt: string | null = null;
    if (f.donate) {
      if (!f.donateDate) return toast.error("Choose the cutoff date for the donation fallback");
      const d = new Date(`${f.donateDate}T${String(f.donateHour).padStart(2, "0")}:00:00`);
      if (d <= new Date()) return toast.error("The cutoff must be in the future");
      donateAt = d.toISOString();
    }
    const loc = sellingLocations.find((l) => l.id === f.location_id) ?? sellingLocations[0];
    setBusy(true);
    const { error } = await supabase.from("coupons").insert({
      location_id: loc.id, organization_id: profile!.organization_id!, title: f.title.trim(), description: f.description.trim() || null,
      price, original_price: Number(f.original_price) || null, quantity_available: qty, coupon_active_start: new Date().toISOString(),
      coupon_active_end: new Date(f.end).toISOString(), pickup_address: loc.pickup_address || loc.address || null, status: "active",
      donate_unsold: f.donate, donate_at: donateAt,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(f.donate ? "Listing live — unsold items will be donated at your cutoff" : "Listing live — unsold items will simply expire");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["venue-coupons"] });
  };

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const activeCoupons = coupons.filter((c) => c.status === "active").length;
  const couponRevenue = coupons.reduce((s, c) => s + c.price * c.quantity_sold, 0);
  const steps = [
    { label: "Create your Stripe account", done: !!org?.started },
    { label: "Submit business and bank details", done: !!org?.stripe_details_submitted },
    { label: "Card payments enabled", done: !!org?.stripe_charges_enabled },
    { label: "Payouts enabled", done: !!org?.stripe_payouts_enabled },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">Sell surplus food on the GO See The City app</p>
      </div>

      {!cityOpen ? (
        <div className="bg-card rounded-xl border p-8 text-center space-y-4">
          <Rocket className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Marketplace Coming Soon</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The Hariet.AI Marketplace is launching soon on the GO See The City app. Selling and Stripe connection are turned off until it goes live in your city.
          </p>
          <Button variant="outline" className="mx-auto" disabled>Connect Stripe</Button>
          <p className="text-xs text-muted-foreground">Available when the marketplace launches</p>
        </div>
      ) : !stripeReady ? (
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Activate selling in 4 steps</h2>
          <p className="text-sm text-muted-foreground">Surplus selling is open in your city. Connect Stripe to get paid directly — no call with our team needed.</p>
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                {s.done ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
              </li>
            ))}
          </ol>
          <Button onClick={startStripe} disabled={busy}><ExternalLink className="w-4 h-4 mr-1" />{org?.started ? "Continue Stripe setup" : "Start Stripe setup"}</Button>
          <p className="text-xs text-muted-foreground">Status updates automatically after Stripe confirms each step.</p>
        </div>
      ) : null}

      <div className={cityOpen && stripeReady ? "space-y-6" : "opacity-50 pointer-events-none select-none space-y-6"} aria-disabled={!(cityOpen && stripeReady)}>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Active Listings</p><p className="text-lg font-bold text-foreground">{activeCoupons}</p></div>
          <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Total Sold</p><p className="text-lg font-bold text-foreground">{coupons.reduce((s, c) => s + c.quantity_sold, 0)}</p></div>
          <div className="bg-card rounded-xl border p-5"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-bold text-foreground">${couponRevenue.toFixed(2)}</p></div>
        </div>
        <div className="flex justify-end">
          <Button disabled={!(cityOpen && stripeReady)} onClick={() => { setF({ ...f, location_id: sellingLocations[0]?.id || "", title: "", description: "", price: "", original_price: "", quantity: "", end: "", donate: false, donateDate: "" }); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Create Listing
          </Button>
        </div>
        <div className="bg-card rounded-xl border">
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Location</TableHead><TableHead>Title</TableHead><TableHead>Price</TableHead><TableHead>Sold / Available</TableHead><TableHead>If unsold</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No listings created yet.</TableCell></TableRow>
              ) : coupons.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{locMap[c.location_id] || "—"}</TableCell>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>${Number(c.price).toFixed(2)}</TableCell>
                  <TableCell>{c.quantity_sold} / {c.quantity_available}</TableCell>
                  <TableCell className="text-xs">{c.converted_listing_id ? "Donated" : c.donate_unsold && c.donate_at ? `Donate at ${new Date(c.donate_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}` : "Expires"}</TableCell>
                  <TableCell className="capitalize"><span className={`px-2.5 py-0.5 text-xs font-semibold rounded ${c.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{c.status.replace(/_/g, " ")}</span></TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New surplus listing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {sellingLocations.length > 1 && (
              <div><Label>Location</Label>
                <Select value={f.location_id} onValueChange={(v) => setF({ ...f, location_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sellingLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Title *</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Surprise bakery bag" /></div>
            <div><Label>Description</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Price *</Label><Input type="number" min="0" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
              <div><Label>Original price</Label><Input type="number" min="0" step="0.01" value={f.original_price} onChange={(e) => setF({ ...f, original_price: e.target.value })} /></div>
              <div><Label>Quantity *</Label><Input type="number" min="1" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
            </div>
            <div><Label>Sale ends *</Label><Input type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label>If unsold by {f.donate && f.donateDate ? `${f.donateDate} ${hourLabel(Number(f.donateHour))}` : "your cutoff time"}, automatically convert the remainder to a donation?</Label>
                  <p className="text-xs text-muted-foreground mt-1">Yes: leftovers become a donation and nearby nonprofits are alerted. No: the listing simply expires.</p>
                </div>
                <Switch checked={f.donate} onCheckedChange={(v) => setF({ ...f, donate: v })} aria-label="Donate unsold items" />
              </div>
              {f.donate && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cutoff date</Label><Input type="date" min={new Date().toISOString().slice(0, 10)} value={f.donateDate} onChange={(e) => setF({ ...f, donateDate: e.target.value })} /></div>
                  <div><Label>Cutoff time</Label>
                    <Select value={f.donateHour} onValueChange={(v) => setF({ ...f, donateHour: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, h) => <SelectItem key={h} value={String(h)}>{hourLabel(h)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={create} disabled={busy}>{busy ? "Publishing..." : "Publish listing"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
