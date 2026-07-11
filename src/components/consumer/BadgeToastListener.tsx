import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";

/** Subscribes to notifications for the logged-in consumer and toasts on badge_awarded. */
const BadgeToastListener = () => {
  const { user } = useConsumerAuth();

  useEffect(() => {
    if (!user) return;

    // Also check for any unread badge notifications when app loads
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, metadata, read_at")
        .eq("user_id", user.id)
        .eq("type", "badge_awarded")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(3);
      (data || []).forEach((n: any) => {
        toast.success(n.title, { description: n.body, duration: 6000 });
      });
      if (data && data.length > 0) {
        await supabase.from("notifications").update({ read_at: new Date().toISOString() })
          .in("id", data.map((n) => n.id));
      }
    })();

    const channel = supabase
      .channel(`badge-toast-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.type === "badge_awarded") {
          toast.success(payload.new.title, { description: payload.new.body, duration: 6000 });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return null;
};

export default BadgeToastListener;
