import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck, Users } from "lucide-react";

type Mode = "choose" | "driver";

/**
 * One-time: choose "Pick up ourselves" or "Order a driver" for a listing.
 * Bulk: pass bulk=true to schedule a monthly bulk driver pickup with a date.
 */
export default function PickupMethodDialog({
  open, onOpenChange, listingId, bulk = false, onSelfPickup, onBeforeDriver, busy,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; listingId?: string | null; bulk?: boolean;
  onSelfPickup?: () => Promise<void> | void; onBeforeDriver?: () => Promise<boolean>; busy?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(bulk ? "driver" : "choose");
  const [provider, setProvider] = useState<"uber" | "doordash">("uber");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [fee, setFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) { setMode(bulk ? "driver" : "choose"); setFee(null); } }, [open, bulk]);

  const body = () => ({
    provider, pickup_kind: bulk ? "monthly_bulk" : "one_time",
    food_listing_id: bulk ? undefined : listingId ?? undefined,
    scheduled_date: bulk ? date || undefined : undefined, pickup_notes: notes || undefined,
  });

  useEffect(() => {
    if (!open || mode !== "driver" || (bulk && !date) || (!bulk && !listingId)) return;
    setFee(null);
    supabase.functions.invoke("driver-order-checkout", { body: { action: "quote", ...body() } }).then(({ data, error }) => {
      if (error || data?.error) toast.error(data?.error ? String(data.error) : "Could not get a fee estimate");
      else setFee(data.estimated_fee_cents);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, provider, date, listingId, bulk]);

  const pay = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("driver-order-checkout", { body: { action: "checkout", ...body() } });
    setLoading(false);
    if (error || !data?.url) return toast.error(data?.error ? String(data.error) : "Could not start payment");
    window.location.href = data.url;
  };

  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bulk ? "Schedule a monthly bulk pickup" : mode === "choose" ? "How will you pick this up?" : "Order a driver"}</DialogTitle>
          {mode === "driver" && <DialogDescription>You pay the delivery fee before a driver is dispatched.</DialogDescription>}
        </DialogHeader>
        {mode === "choose" ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-5 flex-col gap-2" disabled={busy} onClick={async () => { await onSelfPickup?.(); }}>
              <Users className="w-5 h-5" /> Pick up ourselves
            </Button>
            <Button variant="outline" className="h-auto py-5 flex-col gap-2" disabled={busy} onClick={async () => { if (onBeforeDriver && !(await onBeforeDriver())) return; setMode("driver"); }}>
              <Truck className="w-5 h-5" /> Order a driver
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Delivery service</Label>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant={provider === "uber" ? "default" : "outline"} onClick={() => setProvider("uber")}>Uber</Button>
                <Button size="sm" variant={provider === "doordash" ? "default" : "outline"} onClick={() => setProvider("doordash")}>DoorDash</Button>
              </div>
            </div>
            {bulk && <div><Label>Pickup date</Label><Input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} /></div>}
            <div><Label>Notes for the driver (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Estimated delivery fee</span>
                <span>{fee != null ? `$${(fee / 100).toFixed(2)}` : bulk && !date ? "Pick a date" : "Calculating..."}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Shown as charged by the delivery service. Our team confirms the booking after payment.</p>
            </div>
            <div className="flex justify-end gap-2">
              {!bulk && <Button variant="ghost" onClick={() => setMode("choose")}>Back</Button>}
              <Button onClick={pay} disabled={fee == null || loading || (bulk && !date)}>{loading ? "Starting payment..." : "Pay and book driver"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
