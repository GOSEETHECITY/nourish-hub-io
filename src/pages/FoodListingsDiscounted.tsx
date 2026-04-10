import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import StatusChip from "@/components/admin/StatusChip";
import ActionsMenu from "@/components/admin/ActionsMenu";
import type { Coupon, Organization, Location } from "@/types/database";

export default function FoodListingsDiscounted() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const { data: orgs = [] } = useQuery({ queryKey: ["organizations"], queryFn: async () => { const { data } = await supabase.from("organizations").select("id, name"); return (data || []) as Pick<Organization, "id" | "name">[]; } });
  const { data: locs = [] } = useQuery({ queryKey: ["locations"], queryFn: async () => { const { data } = await supabase.from("locations").select("id, name"); return (data || []) as Pick<Location, "id" | "name">[]; } });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o.name])), [orgs]);
  const locMap = useMemo(() => Object.fromEntries(locs.map((l) => [l.id, l.name])), [locs]);

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Coupon deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let result = coupons;
    if (filterStatus !== "all") result = result.filter((c) => c.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => [c.title, orgMap[c.organization_id], locMap[c.location_id]].filter(Boolean).some((f) => f!.toLowerCase().includes(q)));
    }
    result = [...result].sort((a: any, b: any) => {
      const av = a[sortField], bv = b[sortField];
      if (av == null) return 1; if (bv == null) return -1;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return result;
  }, [coupons, filterStatus, search, sortField, sortAsc, orgMap, locMap]);

  const toggleSort = (field: string) => { if (sortField === field) setSortAsc(!sortAsc); else { setSortField(field); setSortAsc(true); } };
  const SortHead = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Food Listings — Discounted Sale</h1>
        <p className="text-sm text-muted-foreground mt-1">All discounted surplus food coupons</p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search coupons..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Filter by status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold_out">Sold Out</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="taken_down">Taken Down</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="organization_id">Organization</SortHead>
              <SortHead field="location_id">Location</SortHead>
              <SortHead field="title">Coupon Title</SortHead>
              <SortHead field="price">Price</SortHead>
              <SortHead field="quantity_available">Qty Available</SortHead>
              <TableHead>Status</TableHead>
              <SortHead field="created_at">Date Posted</SortHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No coupons found</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/discounted-sale/${c.id}`)}>
                <TableCell className="font-medium">{orgMap[c.organization_id] || "—"}</TableCell>
                <TableCell>{locMap[c.location_id] || "—"}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>${c.price.toFixed(2)}</TableCell>
                <TableCell>{c.quantity_available}</TableCell>
                <TableCell><StatusChip status={c.status} /></TableCell>
                <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <ActionsMenu
                    entityName={c.title}
                    onView={() => navigate(`/food-listings/discounted-sale/${c.id}`)}
                    onDelete={() => deleteCoupon.mutate(c.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
