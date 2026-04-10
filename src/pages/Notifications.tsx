import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Package, UserPlus, Ticket, Globe, CreditCard, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdminNotification[];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications-all"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications-all"] }),
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <Check className="w-4 h-4 mr-2" />Mark all as read
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Notification</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : notifications.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">You're all caught up! 🎉</TableCell></TableRow>
            ) : notifications.map((n) => {
              const Icon = iconMap[n.type] || Bell;
              return (
                <TableRow
                  key={n.id}
                  className={`cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`}
                  onClick={() => { if (n.link) navigate(n.link); if (!n.is_read) markRead.mutate(n.id); }}
                >
                  <TableCell>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!n.is_read ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${!n.is_read ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className={`text-sm ${!n.is_read ? "font-semibold" : ""}`}>{n.title}</p>
                    {n.description && <p className="text-xs text-muted-foreground">{n.description}</p>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</TableCell>
                  <TableCell>
                    {!n.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                        className="p-1 rounded hover:bg-muted"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
