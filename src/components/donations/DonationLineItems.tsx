import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatFoodType = (t: string | null | undefined) =>
  t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

export default function DonationLineItems({ listingId }: { listingId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["donation-line-items", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donation_line_items")
        .select("id, description, food_type, pounds, unit_value, total_value")
        .eq("food_listing_id", listingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!listingId,
  });

  if (isLoading || items.length === 0) return null;

  const totalPounds = items.reduce((s, i: any) => s + Number(i.pounds || 0), 0);
  const totalValue = items.reduce((s, i: any) => s + Number(i.total_value || i.unit_value || 0), 0);

  return (
    <div className="bg-card rounded-xl border p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">Itemized Breakdown</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Food Type</TableHead>
            <TableHead className="text-right">Weight (lbs)</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it: any) => (
            <TableRow key={it.id}>
              <TableCell className="font-medium">{it.description}</TableCell>
              <TableCell>{formatFoodType(it.food_type)}</TableCell>
              <TableCell className="text-right">{it.pounds ?? "—"}</TableCell>
              <TableCell className="text-right">${Number(it.total_value || it.unit_value || 0).toFixed(2)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-semibold bg-muted/30">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right">{totalPounds}</TableCell>
            <TableCell className="text-right">${totalValue.toFixed(2)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

