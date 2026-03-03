import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Building2, Heart, MapPin, Headphones, Check } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "org" | "nonprofit" | "location" | "support";
  title: string;
  subtitle: string;
  route: string;
  created_at: string;
}

const DISMISSED_KEY = "hariet_dismissed_notifications";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}

function setDismissed(ids: string[]) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissedState] = useState<string[]>(getDismissed);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: pendingOrgs = [] } = useQuery({
    queryKey: ["notif-pending-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name, created_at").eq("approval_status", "pending").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: pendingNps = [] } = useQuery({
    queryKey: ["notif-pending-nps"],
    queryFn: async () => {
      const { data } = await supabase.from("nonprofits").select("id, organization_name, created_at").eq("approval_status", "pending").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: pendingLocs = [] } = useQuery({
    queryKey: ["notif-pending-locs"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("id, name, organization_id, created_at").eq("approval_status", "pending").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: newSupport = [] } = useQuery({
    queryKey: ["notif-new-support"],
    queryFn: async () => {
      const { data } = await supabase.from("support_requests").select("id, subject, created_at").eq("status", "new").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const notifications: NotificationItem[] = [
    ...pendingOrgs.map((o: any) => ({ id: `org-${o.id}`, type: "org" as const, title: o.name, subtitle: "New organization pending approval", route: `/organizations/${o.id}`, created_at: o.created_at })),
    ...pendingNps.map((n: any) => ({ id: `np-${n.id}`, type: "nonprofit" as const, title: n.organization_name, subtitle: "New nonprofit pending approval", route: `/nonprofits/${n.id}`, created_at: n.created_at })),
    ...pendingLocs.map((l: any) => ({ id: `loc-${l.id}`, type: "location" as const, title: l.name, subtitle: "New location pending approval", route: `/organizations/${l.organization_id}/locations/${l.id}`, created_at: l.created_at })),
    ...newSupport.map((s: any) => ({ id: `sup-${s.id}`, type: "support" as const, title: s.subject, subtitle: "New support request", route: "/support", created_at: s.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const unread = notifications.filter((n) => !dismissed.includes(n.id));
  const hasUnread = unread.length > 0;

  const markRead = (id: string) => {
    const next = [...dismissed, id];
    setDismissedState(next);
    setDismissed(next);
  };

  const markAllRead = () => {
    const next = [...dismissed, ...notifications.map((n) => n.id)];
    setDismissedState(next);
    setDismissed(next);
  };

  const iconMap = { org: Building2, nonprofit: Heart, location: MapPin, support: Headphones };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {hasUnread && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {hasUnread && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            ) : (
              notifications.map((n) => {
                const Icon = iconMap[n.type];
                const isRead = dismissed.includes(n.id);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors ${!isRead ? "bg-primary/5" : ""}`}
                    onClick={() => { navigate(n.route); setOpen(false); }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!isRead ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${!isRead ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!isRead ? "font-semibold text-foreground" : "text-foreground"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
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
