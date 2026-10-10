import { useEffect, useState } from "react";
import { Bell, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";

type Note = { id: string; title: string; body: string | null; link_path: string | null; read_at: string | null; created_at: string };

const ConsumerNotifications = () => {
  const navigate = useNavigate();
  const { user } = useConsumerAuth();
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, link_path, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const list = (data as Note[]) || [];
      setItems(list);
      setLoading(false);
      const unread = list.filter((n) => !n.read_at).map((n) => n.id);
      if (unread.length) {
        await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
    })();
  }, [user]);

  return (
    <ConsumerMobileLayout>
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="w-6 h-6 text-[#1B2A4A]" /></button>
        <h1 className="text-lg font-bold text-[#1B2A4A]">Notifications</h1>
      </header>
      {loading ? (
        <p className="text-center text-gray-400 py-12">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Bell className="w-16 h-16 text-gray-300" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <ul className="px-4 pb-8 divide-y divide-gray-100">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => n.link_path && navigate(n.link_path)}
                className={`w-full text-left py-3 flex gap-3 ${!n.read_at ? "font-semibold" : ""}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read_at ? "bg-[#F97316]" : "bg-transparent"}`} />
                <div>
                  <p className="text-sm text-[#1B2A4A]">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 font-normal">{n.body}</p>}
                  <p className="text-[11px] text-gray-400 font-normal mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </ConsumerMobileLayout>
  );
};

export default ConsumerNotifications;
