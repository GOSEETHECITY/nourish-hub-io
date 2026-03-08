import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { SupportRequest } from "@/types/database";

export default function VenueSupport() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subject: "", message: "" });

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
      return data as SupportRequest[];
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
    onError: (e) => toast.error(e.message),
  });

  const STATUS_COLORS: Record<string, string> = {
    new: "bg-chart-1/15 text-chart-1",
    in_progress: "bg-chart-4/15 text-chart-4",
    resolved: "bg-success/15 text-success",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Submit a support request or view your history</p>
      </div>

      <section className="bg-card rounded-xl border p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground">New Request</h2>
        <div><Label>Subject *</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief description of the issue" /></div>
        <div><Label>Message *</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe your issue in detail" rows={4} /></div>
        <Button onClick={() => submit.mutate()} disabled={!form.subject || !form.message || submit.isPending}>
          {submit.isPending ? "Submitting..." : "Submit Request"}
        </Button>
      </section>

      <section className="bg-card rounded-xl border">
        <div className="p-4 border-b"><h2 className="text-lg font-bold text-foreground">Your Requests</h2></div>
        <Table>
          <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No support requests submitted yet.</TableCell></TableRow>
            ) : requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.subject}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[r.status] || ""}`}>{r.status.replace(/_/g, " ")}</span></TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
