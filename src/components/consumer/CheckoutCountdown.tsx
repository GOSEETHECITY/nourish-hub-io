import { useEffect, useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const HOLD_MINUTES = 5;
const KEY = "gstc_checkout_hold";
const WARN_SECONDS = 60;

type Hold = { expiresAt: number; orderIds: string[] };

export function startCheckoutHold(orderIds: string[]) {
  const hold: Hold = { expiresAt: Date.now() + HOLD_MINUTES * 60 * 1000, orderIds };
  localStorage.setItem(KEY, JSON.stringify(hold));
  window.dispatchEvent(new Event("gstc-hold"));
}

export function clearCheckoutHold() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("gstc-hold"));
}

function readHold(): Hold | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

/** Shows the 5-minute checkout timer, a friendly heads-up when time runs low, and a released message at zero. */
export default function CheckoutCountdown({ justStarted = false }: { justStarted?: boolean }) {
  const [hold, setHold] = useState<Hold | null>(readHold);
  const [now, setNow] = useState(Date.now());
  const [dialog, setDialog] = useState<"start" | "warn" | "expired" | null>(justStarted ? "start" : null);
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    const sync = () => setHold(readHold());
    window.addEventListener("gstc-hold", sync);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { window.removeEventListener("gstc-hold", sync); clearInterval(t); };
  }, []);

  useEffect(() => { if (justStarted) setDialog("start"); }, [justStarted]);

  const expire = useCallback(async (h: Hold) => {
    clearCheckoutHold();
    setDialog("expired");
    await supabase.rpc("release_own_pending_orders" as any, { p_ids: h.orderIds });
  }, []);

  const left = hold ? Math.max(0, Math.ceil((hold.expiresAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!hold) return;
    if (left === 0) { expire(hold); return; }
    if (left <= WARN_SECONDS && !warned) { setWarned(true); setDialog("warn"); }
  }, [left, hold, warned, expire]);

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  const copy = {
    start: { title: "Your items are on hold for you!", body: `We're saving your items for ${HOLD_MINUTES} minutes while you finish checking out. If payment isn't completed in time, they'll go back up for grabs so someone else can enjoy them.` },
    warn: { title: "Just a friendly heads-up", body: `You've got about ${mm > 0 ? `${mm}:${ss}` : `${left} seconds`} left to finish paying. After that, your reserved items will go back up for grabs.` },
    expired: { title: "Your items were released", body: "Time ran out, so your reserved items went back up for grabs. No worries, nothing was charged. Your cart is still here if you'd like to try again." },
  };

  return (
    <>
      {hold && left > 0 && (
        <div role="timer" aria-live="polite"
          className={`flex items-center justify-between rounded-xl px-4 py-3 mb-3 text-sm font-semibold ${left <= WARN_SECONDS ? "bg-orange-100 text-[#C2410C]" : "bg-orange-50 text-[#1B2A4A]"}`}>
          <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-[#F97316]" />Items held for you</span>
          <span className="tabular-nums text-lg text-[#F97316]">{mm}:{ss}</span>
        </div>
      )}
      <AlertDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy[dialog].title}</AlertDialogTitle>
              <AlertDialogDescription>{copy[dialog].body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction className="bg-[#F97316] hover:bg-[#EA6C10]" onClick={() => setDialog(null)}>
                {dialog === "expired" ? "Got it" : "Sounds good"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
}
