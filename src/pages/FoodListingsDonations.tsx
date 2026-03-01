import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FoodListing, Organization, Location } from "@/types/database";

export default function FoodListingsDonations() {
  const navigate = useNavigate();
  const [filterFoodType, setFilterFoodType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["donation-listings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("food_listings").select("*").eq("listing_type", "donation").order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodListing[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name");
      if (error) throw error;
      return data as Pick<Organization, "id" | "name">[];
    },
  });

  const { data: locs = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id, name, city, state");
      if (error) throw error;
      return data as Pick<Location, "id" | "name" | "city" | "state">[];
    },
  });

  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o.name])), [orgs]);
  const locMap = useMemo(() => Object.fromEntries(locs.map((l) => [l.id, l])), [locs]);

  const filtered = useMemo(() => {
    let result = listings.filter((l) => {
      if (filterFoodType !== "all" && l.food_type !== filterFoodType) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      return true;
    });
    result.sort((a: any, b: any) => {
      const av = a[sortField], bv = b[sortField];
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return result;
  }, [listings, filterFoodType, filterStatus, sortField, sortAsc]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortHead = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const formatStatus = (s: string) => s.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Food Listings — Donations</h1>
        <p className="text-sm text-muted-foreground mt-1">All donation listings across the platform</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterFoodType} onValueChange={setFilterFoodType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Food Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Food Types</SelectItem>
            {["prepared_meals","produce","dairy","meat_protein","baked_goods","shelf_stable","frozen"].map((t) => (
              <SelectItem key={t} value={t}>{t.split("_").map(w => w[0].toUpperCase()+w.slice(1)).join(" ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["posted","claimed","picked_up","pending_impact_report","completed","cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead field="organization_id">Organization</SortHead>
              <SortHead field="location_id">Location</SortHead>
              <SortHead field="food_type">Food Type</SortHead>
              <SortHead field="pounds">Pounds</SortHead>
              <TableHead>Pickup Window</TableHead>
              <SortHead field="status">Status</SortHead>
              <SortHead field="created_at">Date Posted</SortHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No donations found</TableCell></TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/food-listings/donations/${l.id}`)}>
                  <TableCell className="font-medium">{orgMap[l.organization_id] || "—"}</TableCell>
                  <TableCell>{locMap[l.location_id]?.name || "—"}</TableCell>
                  <TableCell className="capitalize">{l.food_type?.replace(/_/g, " ") || "—"}</TableCell>
                  <TableCell>{l.pounds || "—"}</TableCell>
                  <TableCell>{l.pickup_window_start ? new Date(l.pickup_window_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}{l.pickup_window_end ? ` – ${new Date(l.pickup_window_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</TableCell>
                  <TableCell><span className="capitalize">{formatStatus(l.status)}</span></TableCell>
                  <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
