import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import SupportThread from "@/components/support/SupportThread";
import EmptyState from "@/components/EmptyState";
import { Headphones } from "lucide-react";
import type { SupportRequest } from "@/types/database";

type Row = SupportRequest & {
  user_last_viewed_at: string | null;
  last_message_at: string | null;
  last_message_role: string | null;
};

function isUnreadForUser(r: Row) {
  if (!r.last_message_at || r.last_message_role !== "admin") return false;
  return !r.user_last_viewed_at || new Date(r.last_message_at) > new Date(r.user_last_viewed_at);
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-chart-1/15 text-chart-1",
  in_progress: "bg-chart-4/15 text-chart-4",
  resolved: "bg-success/15 text-success",
};

export default function VenueSupport() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [selected, setSelected] = useState<Row | null>(null);

  const { data: org } = useQuery({
    queryKey: ["venue-org-name", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("name").eq("id", profile!.organization_id!).single();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["my-support", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
    enabled: !!user?.id,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_requests").insert({
        user_id: user!.id, subject: form.subject, message: form.message,
        user_name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
        email: profile?.email || user?.email || null,
        organization_name: org?.name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-support"] });
      toast.success("Support request submitted!");
      setForm({ subject: "", message: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Send us a message and follow the conversation here.</p>
      </div>

      <div className="bg-card rounded-xl border p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="venue-subject">Subject</Label>
          <Input id="venue-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What is this about?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="venue-message">Message</Label>
          <Textarea id="venue-message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you need help with." />
        </div>
        <Button
          onClick={() => submit.mutate()}
          disabled={!form.subject.trim() || form.message.trim().length < 5 || submit.isPending}
        >
          {submit.isPending ? "Sending..." : "Submit request"}
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Your requests</h2>
        {requests.length === 0 ? (
          <EmptyState icon={Headphones} title="No support requests yet" description="Anything you send will appear here with our replies." />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-card rounded-xl border p-4 hover:border-primary transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span className="font-medium text-foreground inline-flex items-center gap-2 break-words">
                    {isUnreadForUser(r) && <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-label="New reply" />}
                    {r.subject}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[r.status]}`}>{r.status.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last activity {new Date(r.last_message_at ?? r.created_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected?.subject}</DialogTitle></DialogHeader>
          {selected && (
            <SupportThread
              requestId={selected.id}
              original={{ name: selected.user_name, role: "partner", body: selected.message, created_at: selected.created_at }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
