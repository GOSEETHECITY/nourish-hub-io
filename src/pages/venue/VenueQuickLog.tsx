import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVenuePostingGate } from "@/hooks/useVenuePostingGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Zap, CheckCircle2 } from "lucide-react";

const TYPES = [
  { v: "prepared_meals", l: "Prepared meals" }, { v: "produce", l: "Produce" }, { v: "baked_goods", l: "Baked goods" },
  { v: "dairy", l: "Dairy" }, { v: "meat_protein", l: "Protein" }, { v: "mixed", l: "Mixed" },
] as const;

/** "Log a donation in 30 seconds": photo + pounds + one tap. Pickup window defaults to now through 3 hours. */
export default function VenueQuickLog() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const gate = useVenuePostingGate(profile?.organization_id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pounds, setPounds] = useState("");
  const [type, setType] = useState<string>("prepared_meals");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose a photo");
    if (f.size > 10 * 1024 * 1024) return toast.error("Photo must be under 10 MB");
    setPhoto(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    const lbs = Number(pounds);
    if (!Number.isFinite(lbs) || lbs <= 0) return toast.error("Enter the pounds");
    if (!profile?.organization_id) return;
    if (gate.dormant) return toast.error("This one-time event account is no longer active.");
    if (gate.missing.length) { toast.error(`Before posting you need to ${gate.missing.join(" and ")}.`); return navigate("/venue/baseline"); }
    const loc: any = gate.locations.find((l: any) => l.id === profile.location_id) ?? gate.locations[0];
    if (!loc) return toast.error("Add a location first");
    setBusy(true);
    let path: string | null = null;
    try {
      let photoUrls: string[] | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
        path = `${profile.organization_id}/${crypto.randomUUID()}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("donation-photos").upload(path, photo, { contentType: photo.type });
        if (error) throw error;
        const { data: signed } = await supabase.storage.from("donation-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
        photoUrls = signed?.signedUrl ? [signed.signedUrl] : null;
      }
      const start = new Date(Date.now() + 5 * 60 * 1000);
      const end = new Date(start.getTime() + 3 * 3600 * 1000);
      const { data: row, error } = await supabase.from("food_listings").insert({
        location_id: loc.id, organization_id: profile.organization_id, listing_type: "donation", food_type: type as any,
        pounds: lbs, pickup_address: loc.pickup_address || loc.address || null,
        pickup_window_start: start.toISOString(), pickup_window_end: end.toISOString(),
        notes: "Quick-logged donation", is_flash: false, is_free_to_public: false, photo_urls: photoUrls,
      } as any).select("id").single();
      if (error) throw error;
      const { error: liErr } = await supabase.from("donation_line_items").insert({
        food_listing_id: row.id, description: TYPES.find((t) => t.v === type)?.l ?? "Surplus food",
        quantity: 1, unit_value: 0, food_type: type as any, pounds: lbs,
      });
      if (liErr) { await supabase.from("food_listings").delete().eq("id", row.id); throw liErr; }
      qc.invalidateQueries({ queryKey: ["venue-listings"] });
      setDone(true);
    } catch (e: any) {
      if (path) await supabase.storage.from("donation-photos").remove([path]);
      toast.error(e.message || "Could not log donation");
    }
    setBusy(false);
  };

  if (done) return (
    <div className="max-w-md mx-auto text-center space-y-4 py-12">
      <CheckCircle2 className="w-14 h-14 text-success mx-auto" />
      <h1 className="text-2xl font-bold text-foreground">Donation posted</h1>
      <p className="text-muted-foreground">Nearby nonprofits are being alerted. Track it live on your dashboard.</p>
      <div className="flex gap-2 justify-center">
        <Button onClick={() => { setDone(false); setPhoto(null); setPreview(null); setPounds(""); }}>Log another</Button>
        <Button variant="outline" onClick={() => navigate("/venue")}>Dashboard</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> Quick log</h1>
        <p className="text-sm text-muted-foreground">Snap a photo, enter pounds, post. Pickup window is the next 3 hours.</p>
      </div>
      {gate.isOneTime && gate.eventName && <p className="text-sm rounded-lg bg-muted p-3">One-time event: <strong>{gate.eventName}</strong>{gate.eventDate ? ` · ${gate.eventDate}` : ""}</p>}
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full aspect-[4/3] rounded-xl border-2 border-dashed bg-muted/40 flex flex-col items-center justify-center gap-2 overflow-hidden">
        {preview ? <img src={preview} alt="Donation" className="w-full h-full object-cover" /> : (<><Camera className="w-10 h-10 text-muted-foreground" /><span className="text-sm text-muted-foreground">Tap to take a photo</span></>)}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div>
        <Input type="number" inputMode="decimal" min="0" placeholder="Pounds" value={pounds} onChange={(e) => setPounds(e.target.value)} className="h-14 text-2xl text-center" />
      </div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => <Button key={t.v} type="button" size="sm" variant={type === t.v ? "default" : "outline"} onClick={() => setType(t.v)}>{t.l}</Button>)}
      </div>
      <Button className="w-full h-14 text-lg" onClick={submit} disabled={busy || gate.loading || !pounds}>{busy ? "Posting..." : "Post donation"}</Button>
    </div>
  );
}
