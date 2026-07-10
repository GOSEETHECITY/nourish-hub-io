import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Listing = {
  id: string;
  food_type: string | null;
  pounds: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  pickup_window_end: string;
  flash_price_cents: number | null;
  is_free_to_public: boolean;
  organization_id: string;
  location_id: string;
  pickup_address: string | null;
};

export default function ConsumerFlashDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useConsumerAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [reservedByMe, setReservedByMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("food_listings")
        .select("id, food_type, pounds, notes, photo_urls, pickup_window_end, flash_price_cents, is_free_to_public, organization_id, location_id, pickup_address")
        .eq("id", id)
        .eq("is_flash", true)
        .maybeSingle();
      setListing(data as Listing | null);

      if (data && user) {
        const { data: consumer } = await supabase.from("consumers").select("id").eq("user_id", user.id).maybeSingle();
        if (consumer) {
          const { data: existing } = await supabase.from("flash_reservations")
            .select("id").eq("food_listing_id", id).eq("consumer_id", consumer.id).eq("status", "reserved").maybeSingle();
          setReservedByMe(!!existing);
        }
      }
    })();
  }, [id, user]);

  useEffect(() => {
    if (!listing) return;
    const tick = () => {
      const ms = new Date(listing.pickup_window_end).getTime() - Date.now();
      if (ms <= 0) { setCountdown("Window closed"); return; }
      const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [listing]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`flash-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "flash_reservations", filter: `food_listing_id=eq.${id}` }, () => {
        // refresh reservation state
        (async () => {
          if (!user) return;
          const { data: consumer } = await supabase.from("consumers").select("id").eq("user_id", user.id).maybeSingle();
          if (!consumer) return;
          const { data: existing } = await supabase.from("flash_reservations")
            .select("id").eq("food_listing_id", id).eq("consumer_id", consumer.id).eq("status", "reserved").maybeSingle();
          setReservedByMe(!!existing);
        })();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  async function reserveFree() {
    if (!listing) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("reserve_flash_listing", { p_listing_id: listing.id });
      if (error) throw error;
      setReservedByMe(true);
      toast.success("Reserved. Head to the pickup window shown above.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reserve");
    } finally { setBusy(false); }
  }

  async function reservePaid() {
    if (!listing) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { kind: "flash", flash_listing_id: listing.id },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else if (data?.free) { setReservedByMe(true); toast.success("Reserved."); }
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout failed");
    } finally { setBusy(false); }
  }

  if (!listing) return <div className="p-6 text-white">Loading…</div>;

  const price = Number(listing.flash_price_cents ?? 0);
  const isFree = listing.is_free_to_public || price === 0;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <button onClick={() => nav(-1)} className="text-sm text-white/70 mb-3">← Back</button>
      {listing.photo_urls?.[0] && (
        <img src={listing.photo_urls[0]} alt="" className="w-full h-56 object-cover rounded-xl mb-4" />
      )}
      <div className="inline-block rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold mb-2">FLASH</div>
      <h1 className="text-2xl font-bold">{listing.food_type ?? "Surplus food"}</h1>
      <p className="text-white/70 mt-1">{listing.pounds ? `${listing.pounds} lbs · ` : ""}Pickup window closes in {countdown}</p>
      {listing.notes && <p className="mt-3">{listing.notes}</p>}
      {listing.pickup_address && (
        <p className="mt-3 text-sm text-white/70">Pickup: {listing.pickup_address}</p>
      )}

      <div className="mt-6 rounded-xl bg-white/10 p-4">
        <div className="flex justify-between items-baseline">
          <span>Price</span>
          <span className="text-2xl font-bold">{isFree ? "FREE" : `$${(price / 100).toFixed(2)}`}</span>
        </div>
      </div>

      <Button
        className="w-full mt-6 h-14 text-lg bg-orange-500 hover:bg-orange-600 text-white"
        disabled={busy || reservedByMe}
        onClick={isFree ? reserveFree : reservePaid}
      >
        {reservedByMe ? "You reserved this" : busy ? "Working…" : isFree ? "Reserve free pickup" : `Pay & reserve`}
      </Button>

      <p className="mt-4 text-xs text-white/60">
        First-come, first-served. If you don't confirm pickup before the window closes, the reservation is released
        automatically for someone else.
      </p>
    </div>
  );
}
