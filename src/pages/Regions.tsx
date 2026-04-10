import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import StatusChip, { toStateAbbr } from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";
import { US_STATE_CODES } from "@/lib/constants";

interface Region {
  id: string;
  name: string;
  state: string;
  cities: string[];
  user_count: number;
  status: "locked" | "unlocked";
  unlocked_at: string | null;
  created_at: string;
}

const UNLOCK_THRESHOLD = 500;

const emptyForm = { name: "", state: "", cities: "", user_count: 0 };

export default function Regions() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: regions = [], isLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        cities: Array.isArray(r.cities) ? r.cities : [],
      })) as Region[];
    },
  });

  const saveRegion = useMutation({
    mutationFn: async () => {
      const citiesArr = form.cities.split(",").map((c) => c.trim()).filter(Boolean);
      const userCount = form.user_count || 0;
      const status = userCount >= UNLOCK_THRESHOLD ? "unlocked" : "locked";
      const payload: any = {
        name: form.name,
        state: form.state,
        cities: citiesArr,
        user_count: userCount,
        status,
        unlocked_at: status === "unlocked" ? new Date().toISOString() : null,
      };
      if (editingRegion) {
        const { error } = await supabase.from("regions").update(payload).eq("id", editingRegion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("regions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      toast.success(editingRegion ? "Region updated" : "Region created");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRegion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("regions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      toast.success("Region deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRegion(null);
    setForm(emptyForm);
  };

  const openEdit = (r: Region) => {
    setEditingRegion(r);
    setForm({
      name: r.name,
      state: r.state,
      cities: r.cities.join(", "),
      user_count: r.user_count,
    });
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    let result = regions;
    if (filterState !== "all") result = result.filter((r) => r.state === filterState);
    if (filterStatus !== "all") result = result.filter((r) => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        [r.name, ...r.cities].some((s) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [regions, filterState, filterStatus, search]);

  const uniqueStates = useMemo(() => [...new Set(regions.map((r) => r.state))].sort(), [regions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage geographic regions — marketplace unlocks at {UNLOCK_THRESHOLD} users
          </p>
        </div>
        <Button onClick={() => { setEditingRegion(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Region
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search regions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by State</Label>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {uniqueStates.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
              <SelectItem value="unlocked">Unlocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Region Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Cities</TableHead>
              <TableHead>User Count</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Unlocked At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Globe className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No regions yet. Add your first region to start tracking unlock progress.</p>
                </TableCell>
              </TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{toStateAbbr(r.state)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.cities.join(", ") || "—"}</TableCell>
                <TableCell>
                  <div>
                    <span className="font-semibold">{r.user_count}</span>
                    {r.status === "locked" && (
                      <div className="mt-1">
                        <Progress value={(r.user_count / UNLOCK_THRESHOLD) * 100} className="h-2" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">{r.user_count} / {UNLOCK_THRESHOLD}</p>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell>
                <TableCell>{r.unlocked_at ? new Date(r.unlocked_at).toLocaleDateString() : "—"}</TableCell>
                <TableCell>
                  <ActionsMenu
                    entityName={r.name}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteRegion.mutate(r.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingRegion ? "Edit Region" : "Add Region"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Orlando Metro" /></div>
            <div>
              <Label>State *</Label>
              <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {US_STATE_CODES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cities</Label>
              <Input value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} placeholder="Orlando, Kissimmee, Winter Park" />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of cities</p>
            </div>
            <div>
              <Label>Initial User Count</Label>
              <Input type="number" value={form.user_count} onChange={(e) => setForm({ ...form, user_count: Number(e.target.value) })} />
            </div>
            <Button className="w-full" onClick={() => saveRegion.mutate()} disabled={!form.name || !form.state || saveRegion.isPending}>
              {saveRegion.isPending ? "Saving..." : editingRegion ? "Save Changes" : "Add Region"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
