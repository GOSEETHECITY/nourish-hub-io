import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { Profile, InvitationCode, InvitationCodeStatus } from "@/types/database";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [filterCity, setFilterCity] = useState("all");
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeFilterCity, setCodeFilterCity] = useState("all");
  const [codeFilterStatus, setCodeFilterStatus] = useState("all");
  const [codeForm, setCodeForm] = useState({ code: "", label: "", city: "", expiration_date: "", status: "active" as InvitationCodeStatus });

  // Consumer users (profiles without org)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["consumer-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").is("organization_id", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ["invitation-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitation_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as InvitationCode[];
    },
  });

  const createCode = useMutation({
    mutationFn: async () => {
      const payload = { ...codeForm, code: codeForm.code || Math.random().toString(36).substring(2, 10).toUpperCase() };
      if (!payload.expiration_date) delete (payload as any).expiration_date;
      const { error } = await supabase.from("invitation_codes").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitation-codes"] });
      toast.success("Invitation code created");
      setCodeDialogOpen(false);
      setCodeForm({ code: "", label: "", city: "", expiration_date: "", status: "active" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitation_codes").update({ status: "inactive" as InvitationCodeStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invitation-codes"] }); toast.success("Code deactivated"); },
  });

  const codeCities = useMemo(() => [...new Set(codes.map((c) => c.city).filter(Boolean))].sort(), [codes]);

  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      if (codeFilterCity !== "all" && c.city !== codeFilterCity) return false;
      if (codeFilterStatus !== "all" && c.status !== codeFilterStatus) return false;
      return true;
    });
  }, [codes, codeFilterCity, codeFilterStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Consumer users and invitation codes for GO See The City</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="codes">Invitation Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No consumer users yet</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.first_name || "—"}</TableCell>
                    <TableCell>{u.last_name || "—"}</TableCell>
                    <TableCell>{u.email || "—"}</TableCell>
                    <TableCell>{u.phone || "—"}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <Select value={codeFilterCity} onValueChange={setCodeFilterCity}><SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger><SelectContent><SelectItem value="all">All Cities</SelectItem>{codeCities.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}</SelectContent></Select>
              <Select value={codeFilterStatus} onValueChange={setCodeFilterStatus}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
            </div>
            <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Create Code</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Invitation Code</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div><Label>Code (leave blank to auto-generate)</Label><Input value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })} placeholder="e.g. OKC2025" /></div>
                  <div><Label>Label / Description</Label><Input value={codeForm.label} onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })} placeholder="e.g. Oklahoma City Launch" /></div>
                  <div><Label>City</Label><Input value={codeForm.city} onChange={(e) => setCodeForm({ ...codeForm, city: e.target.value })} /></div>
                  <div><Label>Expiration Date (optional)</Label><Input type="date" value={codeForm.expiration_date} onChange={(e) => setCodeForm({ ...codeForm, expiration_date: e.target.value })} /></div>
                  <Button className="w-full" onClick={() => createCode.mutate()} disabled={createCode.isPending}>
                    {createCode.isPending ? "Creating..." : "Create Code"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Times Used</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codesLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredCodes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No codes found</TableCell></TableRow>
                ) : filteredCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold">{c.code}</TableCell>
                    <TableCell>{c.label || "—"}</TableCell>
                    <TableCell>{c.city || "—"}</TableCell>
                    <TableCell>{c.times_used}</TableCell>
                    <TableCell>{c.expiration_date ? new Date(c.expiration_date).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell><span className={`px-2.5 py-0.5 text-xs font-semibold rounded capitalize ${c.status === "active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{c.status}</span></TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{c.status === "active" && <Button size="sm" variant="outline" onClick={() => deactivateCode.mutate(c.id)}>Deactivate</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
