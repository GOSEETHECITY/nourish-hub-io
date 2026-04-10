import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Package, UserPlus, Ticket, Globe, CreditCard, Info, Check } from "lucide-react";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const iconMap: Record<string, typeof Bell> = {
  new_donation: Package,
  new_signup: UserPlus,
  new_coupon: Ticket,
  region_unlocked: Globe,
  billing_alert: CreditCard,
  system: Info,
};

const timeAgo = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AdminNotification[];
    },
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const unread = notifications.filter((n) => !n.is_read);
  const hasUnread = unread.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {hasUnread && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <div className="flex items-center gap-3">
              {hasUnread && (
                <button onClick={() => markAllRead.mutate()} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => { navigate("/notifications"); setOpen(false); }} className="text-xs text-primary hover:underline">
                View all
              </button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">You're all caught up! 🎉</p>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.type] || Bell;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors ${!n.is_read ? "bg-[#6d412a]/[0.08]" : ""}`}
                    onClick={() => { if (n.link) navigate(n.link); if (!n.is_read) markRead.mutate(n.id); setOpen(false); }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${!n.is_read ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!n.is_read ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                      {n.description && <p className="text-xs text-muted-foreground truncate">{n.description}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                        className="p-1 rounded hover:bg-muted shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
