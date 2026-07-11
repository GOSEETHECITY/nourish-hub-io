import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid";

const PushOptInButton = () => {
  const { consumer } = useConsumerAuth();
  const [state, setState] = useState<"unsupported" | "denied" | "granted" | "default" | "loading">("loading");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as any);
  }, []);

  const enable = async () => {
    if (!consumer) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm as any); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").insert({
        consumer_id: consumer.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh || "",
        auth: json.keys?.auth || "",
        user_agent: navigator.userAgent,
      });
      if (error && !error.message.includes("duplicate")) throw error;
      setState("granted");
      toast.success("Push notifications enabled");
    } catch (e: any) {
      toast.error(e.message || "Could not enable notifications");
    }
  };

  if (state === "unsupported" || state === "loading") return null;
  if (state === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <Bell className="w-4 h-4 text-[#8DC63F]" /> Push notifications on
      </div>
    );
  }
  return (
    <button onClick={enable}
      className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left">
      <BellOff className="w-5 h-5 text-[#F97316]" />
      <span className="font-medium text-[#1B2A4A]">Enable push notifications</span>
    </button>
  );
};

export default PushOptInButton;
