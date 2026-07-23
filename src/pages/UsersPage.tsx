import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, UserCog, Search, Users, MapPin, Unlock, Award, Ticket, Users2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { Profile, InvitationCode, InvitationCodeStatus, AppRole, CityThreshold } from "@/types/database";
import { US_STATE_CODES } from "@/lib/constants";
import StatusChip from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";

type RoleFilter = "all" | "consumer" | "nonprofit_partner" | "venue_partner" | "admin";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<InvitationCode | null>(null);
  const [codeFilterCity, setCodeFilterCity] = useState("all");
  const [codeFilterStatus, setCodeFilterStatus] = useState("all");
  const [codeForm, setCodeForm] = useState({ code: "", label: "", city: "", state: "", role_type: "Consumer", max_uses: 100, expiration_date: "", status: "active" as InvitationCodeStatus });
  const [codeSearch, setCodeSearch] = useState("");

  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(Profile & { role?: AppRole }) | null>(null);
  const [userEditForm, setUserEditForm] = useState({ first_name: "", last_name: "", email: "", phone: "", organization_id: "", location_id: "", nonprofit_id: "", nonprofit_location_id: "" });
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // ITEM 7 — activity drawer
  const [drawerUser, setDrawerUser] = useState<Profile | null>(null);

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["all-platform-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as { user_id: string; role: AppRole }[];
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["all-orgs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["all-nps-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nonprofits").select("id, organization_name").order("organization_name");
      if (error) throw error;
      return data;
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

  const roleMap = useMemo(() => {
    const map = new Map<string, AppRole>();
    userRoles.forEach((r) => map.set(r.user_id, r.role));
    return map;
  }, [userRoles]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      const role = roleMap.get(u.id) ?? "consumer";
      if (roleFilter !== "all" && role !== roleFilter) return false;
      if (!q) return true;
      return [u.first_name, u.last_name, u.email].filter(Boolean).some((f) => f!.toLowerCase().includes(q));
    });
  }, [allUsers, userSearch, roleFilter, roleMap]);

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const { error } = await supabase.from("profiles").update({
        first_name: userEditForm.first_name || null,
        last_name: userEditForm.last_name || null,
        email: userEditForm.email || null,
        phone: userEditForm.phone || null,
        organization_id: userEditForm.organization_id || null,
        location_id: userEditForm.location_id || null,
        nonprofit_id: userEditForm.nonprofit_id || null,
        nonprofit_location_id: userEditForm.nonprofit_location_id || null,
      }).eq("id", editingUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-platform-users"] });
      toast.success("User updated");
      setEditUserOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const openEditUser = (u: Profile) => {
    setEditingUser(u);
    setUserEditForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email || "",
      phone: u.phone || "",
      organization_id: u.organization_id || "",
      location_id: u.location_id || "",
      nonprofit_id: u.nonprofit_id || "",
      nonprofit_location_id: u.nonprofit_location_id || "",
    });
    setEditUserOpen(true);
  };

  const saveCode = useMutation({
    mutationFn: async () => {
      if (editingCode) {
        const { error } = await supabase.from("invitation_codes").update({
          label: codeForm.label, city: codeForm.city, state: codeForm.state,
          role_type: codeForm.role_type, max_uses: codeForm.max_uses,
          expiration_date: codeForm.expiration_date || null, status: codeForm.status,
        }).eq("id", editingCode.id);
        if (error) throw error;
      } else {
        const payload: any = { ...codeForm, code: codeForm.code || Math.random().toString(36).substring(2, 10).toUpperCase() };
        if (!payload.expiration_date) delete payload.expiration_date;
        delete payload.status;
        const { error } = await supabase.from("invitation_codes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitation-codes"] });
      toast.success(editingCode ? "Code updated" : "Code created");
      closeCodeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitation_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invitation-codes"] }); toast.success("Code deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const closeCodeDialog = () => { setCodeDialogOpen(false); setEditingCode(null); setCodeForm({ code: "", label: "", city: "", state: "", role_type: "Consumer", max_uses: 100, expiration_date: "", status: "active" }); };

  const openEditCode = (c: InvitationCode) => {
    setEditingCode(c);
    setCodeForm({ code: c.code, label: c.label || "", city: c.city || "", state: c.state || "", role_type: c.role_type || "Consumer", max_uses: c.max_uses || 100, expiration_date: c.expiration_date || "", status: c.status });
    setCodeDialogOpen(true);
  };

  const codeCities = useMemo(() => [...new Set(codes.map((c) => c.city).filter(Boolean))].sort(), [codes]);
  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      if (codeFilterCity !== "all" && c.city !== codeFilterCity) return false;
      if (codeFilterStatus !== "all" && c.status !== codeFilterStatus) return false;
      if (codeSearch.trim()) {
        const q = codeSearch.toLowerCase();
        if (![c.code, c.label, c.city].filter(Boolean).some((f) => f!.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [codes, codeFilterCity, codeFilterStatus, codeSearch]);

  const getEffectiveStatus = (c: InvitationCode) => (c.times_used >= c.max_uses ? "expired" : c.status);

  const getRoleBadge = (userId: string) => {
    const role = roleMap.get(userId);
    if (!role) return <span className="text-xs text-muted-foreground">Consumer</span>;
    const colors: Record<string, string> = {
      admin: "bg-destructive/15 text-destructive",
      venue_partner: "bg-chart-1/15 text-chart-1",
      nonprofit_partner: "bg-success/15 text-success",
      government_partner: "bg-chart-4/15 text-chart-4",
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${colors[role] || "bg-muted text-muted-foreground"}`}>{role.replace(/_/g, " ")}</span>;
  };

  const getAssociation = (u: Profile) => {
    if (u.organization_id) {
      const org = organizations.find((o) => o.id === u.organization_id);
      return org ? `Org: ${org.name}` : "Org (unknown)";
    }
    if (u.nonprofit_id) {
      const np = nonprofits.find((n) => n.id === u.nonprofit_id);
      return np ? `NP: ${np.organization_name}` : "NP (unknown)";
    }
    return "—";
  };

  const getLevel = (u: Profile) => {
    if (u.location_id || u.nonprofit_location_id) return "Location";
    if (u.organization_id || u.nonprofit_id) return "Organization";
    return "—";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all platform users and invitation codes</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="consumers">Consumers</TabsTrigger>
          <TabsTrigger value="codes">Invitation Codes</TabsTrigger>
        </TabsList>

        <ConsumersTab onOpenUser={(profile) => setDrawerUser(profile)} />

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            <div className="w-[180px]">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="consumer">Consumers</SelectItem>
                  <SelectItem value="nonprofit_partner">Nonprofits</SelectItem>
                  <SelectItem value="venue_partner">Venues</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Association</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No users found</TableCell></TableRow>
                ) : filteredUsers.map((u) => (
                  <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrawerUser(u)}>
                    <TableCell className="font-medium">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{u.email || "—"}</TableCell>
                    <TableCell>{getRoleBadge(u.id)}</TableCell>
                    <TableCell className="text-sm">{getAssociation(u)}</TableCell>
                    <TableCell className="text-sm">{getLevel(u)}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => openEditUser(u)}><UserCog className="w-3 h-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 items-end flex-1">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search invitation codes..." value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Filter by city</Label>
                <Select value={codeFilterCity} onValueChange={setCodeFilterCity}><SelectTrigger className="w-[140px]"><SelectValue placeholder="City" /></SelectTrigger><SelectContent><SelectItem value="all">All Cities</SelectItem>{codeCities.map((c) => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Filter by status</Label>
                <Select value={codeFilterStatus} onValueChange={setCodeFilterStatus}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
              </div>
            </div>
            <Button onClick={() => { setEditingCode(null); setCodeForm({ code: "", label: "", city: "", state: "", role_type: "Consumer", max_uses: 100, expiration_date: "", status: "active" }); setCodeDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Create Code</Button>
          </div>
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Label</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Role</TableHead><TableHead>Used / Max</TableHead><TableHead>Expiration</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codesLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredCodes.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No codes found</TableCell></TableRow>
                ) : filteredCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold">{c.code}</TableCell>
                    <TableCell>{c.label || "—"}</TableCell>
                    <TableCell>{c.city || "—"}</TableCell>
                    <TableCell>{c.state || "—"}</TableCell>
                    <TableCell>{c.role_type || "Consumer"}</TableCell>
                    <TableCell>{c.times_used} / {c.max_uses}</TableCell>
                    <TableCell>{c.expiration_date ? new Date(c.expiration_date).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell><StatusChip status={getEffectiveStatus(c)} /></TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <ActionsMenu
                        entityName={c.code}
                        onView={() => openEditCode(c)}
                        onEdit={() => openEditCode(c)}
                        onDelete={() => deleteCode.mutate(c.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name</Label><Input value={userEditForm.first_name} onChange={(e) => setUserEditForm({ ...userEditForm, first_name: e.target.value })} /></div>
              <div><Label>Last Name</Label><Input value={userEditForm.last_name} onChange={(e) => setUserEditForm({ ...userEditForm, last_name: e.target.value })} /></div>
            </div>
            <div><Label>Email</Label><Input value={userEditForm.email} onChange={(e) => setUserEditForm({ ...userEditForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={userEditForm.phone} onChange={(e) => setUserEditForm({ ...userEditForm, phone: e.target.value })} /></div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Association</p>
              <div>
                <Label>Organization</Label>
                <Select value={userEditForm.organization_id || "none"} onValueChange={(v) => setUserEditForm({ ...userEditForm, organization_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3">
                <Label>Nonprofit</Label>
                <Select value={userEditForm.nonprofit_id || "none"} onValueChange={(v) => setUserEditForm({ ...userEditForm, nonprofit_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {nonprofits.map((n) => <SelectItem key={n.id} value={n.id}>{n.organization_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full" onClick={() => updateUser.mutate()} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitation Code Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={(open) => { if (!open) closeCodeDialog(); else setCodeDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCode ? "Edit Invitation Code" : "Create Invitation Code"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Code {editingCode ? "(read-only)" : "(leave blank to auto-generate)"}</Label><Input value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value })} disabled={!!editingCode} placeholder="e.g. OKC2025" /></div>
            <div><Label>Label / Description</Label><Input value={codeForm.label} onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })} placeholder="e.g. Oklahoma City Launch" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>City</Label><Input value={codeForm.city} onChange={(e) => setCodeForm({ ...codeForm, city: e.target.value })} /></div>
              <div>
                <Label>State *</Label>
                <Select value={codeForm.state} onValueChange={(v) => setCodeForm({ ...codeForm, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{US_STATE_CODES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Role / Type *</Label>
              <Select value={codeForm.role_type} onValueChange={(v) => setCodeForm({ ...codeForm, role_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consumer">Consumer</SelectItem>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Nonprofit">Nonprofit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Controls which signup flow this code unlocks.</p>
            </div>
            <div>
              <Label>Max Uses *</Label>
              <Input type="number" min={1} value={codeForm.max_uses} onChange={(e) => setCodeForm({ ...codeForm, max_uses: Math.max(1, Number(e.target.value)) })} />
              <p className="text-xs text-muted-foreground mt-1">When times_used reaches this number, the code auto-expires regardless of expiration date.</p>
            </div>
            <div><Label>Expiration Date (optional)</Label><Input type="date" value={codeForm.expiration_date} onChange={(e) => setCodeForm({ ...codeForm, expiration_date: e.target.value })} /></div>
            {editingCode && (
              <div>
                <Label>Status</Label>
                <Select value={codeForm.status} onValueChange={(v) => setCodeForm({ ...codeForm, status: v as InvitationCodeStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={() => saveCode.mutate()} disabled={!codeForm.state || saveCode.isPending}>
              {saveCode.isPending ? "Saving..." : editingCode ? "Save Changes" : "Create Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ITEM 7 — activity drawer */}
      <UserActivityDrawer
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
        onEdit={(u) => { setDrawerUser(null); openEditUser(u); }}
        roleLabel={drawerUser ? (roleMap.get(drawerUser.id) ?? "consumer") : ""}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consumers tab with detailed table + search (ITEM 6b)
// ---------------------------------------------------------------------------
function ConsumersTab({ onOpenUser }: { onOpenUser: (p: Profile) => void }) {
  const queryClient = useQueryClient();
  const [editThreshold, setEditThreshold] = useState<CityThreshold | null>(null);
  const [newThreshold, setNewThreshold] = useState("");
  const [search, setSearch] = useState("");

  const { data: consumers = [] } = useQuery({
    queryKey: ["all-consumers-detailed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consumers")
        .select("id, user_id, first_name, last_name, email, city, zip_code, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: badgeCounts = new Map<string, number>() } = useQuery({
    queryKey: ["consumer-badge-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("consumer_badges").select("consumer_id");
      if (error) throw error;
      const m = new Map<string, number>();
      (data ?? []).forEach((b: any) => m.set(b.consumer_id, (m.get(b.consumer_id) ?? 0) + 1));
      return m;
    },
  });

  const { data: profilesByUserId = new Map<string, Profile>() } = useQuery({
    queryKey: ["consumer-profile-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      const m = new Map<string, Profile>();
      (data as Profile[]).forEach((p) => m.set(p.id, p));
      return m;
    },
  });

  const { data: cityThresholds = [] } = useQuery({
    queryKey: ["city-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("city_thresholds").select("*").order("city");
      if (error) throw error;
      return data as CityThreshold[];
    },
  });

  const updateThreshold = useMutation({
    mutationFn: async () => {
      if (!editThreshold) return;
      const { error } = await supabase.from("city_thresholds").update({ threshold: Number(newThreshold) }).eq("id", editThreshold.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-thresholds"] });
      toast.success("Threshold updated");
      setEditThreshold(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const totalConsumers = consumers.length;
  const citiesWithConsumers = new Set(consumers.map((c: any) => c.city).filter(Boolean)).size;
  const unlockedCities = cityThresholds.filter((c) => c.marketplace_unlocked).length;

  const filteredConsumers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return consumers;
    return consumers.filter((c: any) =>
      [c.first_name, c.last_name, c.email].filter(Boolean).some((f: string) => f.toLowerCase().includes(q))
    );
  }, [consumers, search]);

  return (
    <>
      <TabsContent value="consumers" className="space-y-4 mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4" />Total Consumers</p>
            <p className="text-3xl font-bold text-foreground mt-2">{totalConsumers}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4" />Active Cities</p>
            <p className="text-3xl font-bold text-foreground mt-2">{citiesWithConsumers}</p>
          </div>
          <div className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Unlock className="w-4 h-4" />Unlocked Cities</p>
            <p className="text-3xl font-bold text-foreground mt-2">{unlockedCities}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border">
          <div className="p-4 border-b"><h2 className="text-lg font-bold text-foreground">City Breakdown</h2></div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Consumers</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cityThresholds.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No city data yet</TableCell></TableRow>
              ) : cityThresholds.map((ct) => {
                const pct = Math.min(100, Math.round((ct.current_consumer_count / ct.threshold) * 100));
                return (
                  <TableRow key={ct.id}>
                    <TableCell className="font-medium">{ct.city}</TableCell>
                    <TableCell>{ct.state || "—"}</TableCell>
                    <TableCell>{ct.current_consumer_count}</TableCell>
                    <TableCell>{ct.threshold}</TableCell>
                    <TableCell><div className="flex items-center gap-2 min-w-[120px]"><Progress value={pct} className="h-2 flex-1" /><span className="text-xs text-muted-foreground">{pct}%</span></div></TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded ${ct.marketplace_unlocked ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {ct.marketplace_unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setEditThreshold(ct); setNewThreshold(String(ct.threshold)); }}>Edit Threshold</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* ITEM 6b — consumers table with search */}
        <div className="bg-card rounded-xl border">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">Consumers</h2>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Zip</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Badges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConsumers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No consumers found</TableCell></TableRow>
              ) : filteredConsumers.map((c: any) => {
                const profile = profilesByUserId.get(c.user_id);
                return (
                  <TableRow
                    key={c.id}
                    className={profile ? "cursor-pointer hover:bg-muted/40" : ""}
                    onClick={() => profile && onOpenUser(profile)}
                  >
                    <TableCell className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.city || "—"}</TableCell>
                    <TableCell>{c.zip_code || "—"}</TableCell>
                    <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1 text-sm"><Award className="w-3.5 h-3.5 text-amber-500" />{badgeCounts.get(c.id) ?? 0}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <Dialog open={!!editThreshold} onOpenChange={(open) => { if (!open) setEditThreshold(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Threshold — {editThreshold?.city}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Consumer Threshold</Label><Input type="number" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)} /></div>
            <Button className="w-full" onClick={() => updateThreshold.mutate()} disabled={updateThreshold.isPending}>
              {updateThreshold.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// ITEM 7 — activity drawer
// ---------------------------------------------------------------------------
function UserActivityDrawer({
  user, roleLabel, onClose, onEdit,
}: {
  user: Profile | null;
  roleLabel: string;
  onClose: () => void;
  onEdit: (u: Profile) => void;
}) {
  const open = !!user;

  const { data: consumer } = useQuery({
    queryKey: ["drawer-consumer", user?.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("consumers")
        .select("id, city, zip_code, referral_code")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["drawer-checkins", user?.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_checkins")
        .select("id, checked_in_at, events(title, event_date)")
        .eq("user_id", user!.id)
        .order("checked_in_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data as any[];
    },
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["drawer-badges", consumer?.id],
    enabled: open && !!consumer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("consumer_badges")
        .select("badge_name, badge_icon, earned_at")
        .eq("consumer_id", consumer.id)
        .order("earned_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["drawer-orders", consumer?.id],
    enabled: open && !!consumer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("consumer_orders")
        .select("id, quantity, status, created_at, coupons(title)")
        .eq("consumer_id", consumer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as any[];
    },
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["drawer-referrals", consumer?.id],
    enabled: open && !!consumer?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id, created_at, referee:consumers!referrals_referee_consumer_id_fkey(first_name, last_name, email)")
        .eq("referrer_consumer_id", consumer.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user ? ([user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || "User") : ""}</SheetTitle>
        </SheetHeader>
        {user && (
          <div className="space-y-6 pt-4">
            <div className="bg-muted/40 rounded-xl border p-4 space-y-1 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {user.email || "—"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {user.phone || "—"}</div>
              <div><span className="text-muted-foreground">Role:</span> <span className="capitalize">{roleLabel.replace(/_/g, " ") || "consumer"}</span></div>
              {consumer?.city && <div><span className="text-muted-foreground">City:</span> {consumer.city}{consumer.zip_code ? ` (${consumer.zip_code})` : ""}</div>}
              {consumer?.referral_code && <div><span className="text-muted-foreground">Referral code:</span> <span className="font-mono">{consumer.referral_code}</span></div>}
              <div><span className="text-muted-foreground">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</div>
              <div className="pt-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(user)}><Pencil className="w-3.5 h-3.5 mr-2" />Edit</Button>
              </div>
            </div>

            <ActivitySection title="Check-ins" icon={<CalendarIcon className="w-4 h-4" />} count={checkins.length}>
              {checkins.length === 0 ? (
                <EmptyRow>No event check-ins yet.</EmptyRow>
              ) : checkins.map((c: any) => (
                <div key={c.id} className="flex justify-between text-sm py-2 border-b last:border-none">
                  <span className="font-medium">{c.events?.title ?? "Event"}</span>
                  <span className="text-muted-foreground">{c.checked_in_at ? new Date(c.checked_in_at).toLocaleDateString() : "—"}</span>
                </div>
              ))}
            </ActivitySection>

            <ActivitySection title="Badges earned" icon={<Award className="w-4 h-4" />} count={badges.length}>
              {badges.length === 0 ? (
                <EmptyRow>No badges earned yet.</EmptyRow>
              ) : badges.map((b: any, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b last:border-none">
                  <span className="font-medium">{b.badge_icon} {b.badge_name}</span>
                  <span className="text-muted-foreground">{b.earned_at ? new Date(b.earned_at).toLocaleDateString() : "—"}</span>
                </div>
              ))}
            </ActivitySection>

            <ActivitySection title="Orders" icon={<Ticket className="w-4 h-4" />} count={orders.length}>
              {orders.length === 0 ? (
                <EmptyRow>No orders yet.</EmptyRow>
              ) : orders.map((o: any) => (
                <div key={o.id} className="flex justify-between text-sm py-2 border-b last:border-none">
                  <span className="font-medium">{o.coupons?.title ?? "Coupon"} × {o.quantity}</span>
                  <span className="text-muted-foreground capitalize">{o.status} · {new Date(o.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </ActivitySection>

            <ActivitySection title="Referrals" icon={<Users2 className="w-4 h-4" />} count={referrals.length}>
              {referrals.length === 0 ? (
                <EmptyRow>No referrals yet.</EmptyRow>
              ) : referrals.map((r: any) => (
                <div key={r.id} className="flex justify-between text-sm py-2 border-b last:border-none">
                  <span className="font-medium">
                    {[r.referee?.first_name, r.referee?.last_name].filter(Boolean).join(" ") || r.referee?.email || "Someone"}
                  </span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </ActivitySection>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActivitySection({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2 font-semibold text-sm">{icon}{title}</div>
        <span className="text-xs text-muted-foreground">{count} total</span>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground py-4 text-center">{children}</div>;
}
