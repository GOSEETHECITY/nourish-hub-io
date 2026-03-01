import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Coupon, Organization, Location } from "@/types/database";

export default function FoodListingsDiscounted() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

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

  const filtered = useMemo(() => {
    let result = coupons.filter((c) => filterStatus === "all" || c.status === filterStatus);
    result.sort((a: any, b: any) => {
      const av = a[sortField], bv = b[sortField];
      if (av == null) return 1; if (bv == null) return -1;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return result;
  }, [coupons, filterStatus, sortField, sortAsc]);

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
      <div className="flex gap-3">
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
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="organization_id">Organization</SortHead>
              <SortHead field="location_id">Location</SortHead>
              <SortHead field="title">Coupon Title</SortHead>
              <SortHead field="price">Price</SortHead>
              <SortHead field="quantity_available">Qty Available</SortHead>
              <SortHead field="status">Status</SortHead>
              <SortHead field="created_at">Date Posted</SortHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No coupons found</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/discounted-sale/${c.id}`)}>
                <TableCell className="font-medium">{orgMap[c.organization_id] || "—"}</TableCell>
                <TableCell>{locMap[c.location_id] || "—"}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>${c.price.toFixed(2)}</TableCell>
                <TableCell>{c.quantity_available}</TableCell>
                <TableCell className="capitalize">{c.status.replace(/_/g, " ")}</TableCell>
                <TableCell>{new Date(c.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
