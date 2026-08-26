import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * One-time welcome shown to a partner the first time they reach the dashboard
 * after approval. Dismissal is persisted on profiles.gstc_welcome_seen.
 */
export default function GstcWelcomeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("gstc_welcome_seen")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data && (data as any).gstc_welcome_seen === false) setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const dismiss = async () => {
    setSaving(true);
    try {
      if (user?.id) {
        await supabase.from("profiles").update({ gstc_welcome_seen: true } as any).eq("id", user.id);
      }
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) void dismiss(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">You Also Get Access to the Go See The City App! 🎉</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            As a HarietAI partner, you automatically get access to the Go See The City app. We're launching soon in
            your city, and you get first access as we roll out!
          </p>
          <p>
            The app will be available to consumers throughout your community. When you're ready to step away from the
            business, use Go See The City to discover grand opening events and more.
          </p>
          <p>Your business keeps you busy, so Go See The City gives you a chance to enjoy the city, too!</p>
          <p>
            Be sure to check the app week by week. As we continue to expand, you'll see more events and experiences
            added.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={dismiss} disabled={saving} className="w-full sm:w-auto">Got It!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
