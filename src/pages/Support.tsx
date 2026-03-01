import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { SupportRequest, SupportStatus } from "@/types/database";

export default function Support() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["support-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupportRequest[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SupportStatus }) => {
      const { error } = await supabase.from("support_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-requests"] });
      toast.success("Status updated");
    },
  });

  const STATUS_COLORS: Record<SupportStatus, string> = {
    new: "bg-chart-1/15 text-chart-1",
    in_progress: "bg-chart-4/15 text-chart-4",
    resolved: "bg-success/15 text-success",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage support requests</p>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : requests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No support requests</TableCell></TableRow>
            ) : requests.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelectedRequest(r)}>
                <TableCell>{r.organization_name || "—"}</TableCell>
                <TableCell>{r.user_name || "—"}</TableCell>
                <TableCell>{r.email || "—"}</TableCell>
                <TableCell className="font-medium">{r.subject}</TableCell>
                <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${STATUS_COLORS[r.status]}`}>{r.status.replace(/_/g, " ")}</span></TableCell>
                <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Support Request</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Organization</p><p className="text-sm text-foreground mt-1">{selectedRequest.organization_name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">User</p><p className="text-sm text-foreground mt-1">{selectedRequest.user_name || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p><p className="text-sm text-foreground mt-1">{selectedRequest.email || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Phone</p><p className="text-sm text-foreground mt-1">{selectedRequest.phone || "—"}</p></div>
              </div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Subject</p><p className="text-sm font-medium text-foreground mt-1">{selectedRequest.subject}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase tracking-wider">Message</p><p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{selectedRequest.message}</p></div>
              <div className="flex items-center gap-4 pt-4 border-t">
                <p className="text-sm font-medium text-foreground">Status:</p>
                <Select value={selectedRequest.status} onValueChange={(v) => { updateStatus.mutate({ id: selectedRequest.id, status: v as SupportStatus }); setSelectedRequest({ ...selectedRequest, status: v as SupportStatus }); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
