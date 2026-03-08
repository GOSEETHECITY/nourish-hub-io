import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Nonprofit } from "@/types/database";

export default function GovernmentNonprofits() {
  const { data: nonprofits = [] } = useQuery({
    queryKey: ["gov-nonprofits"],
    queryFn: async () => {
      const { data } = await supabase.from("nonprofits").select("*").eq("approval_status", "approved").order("organization_name");
      return (data || []) as Nonprofit[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nonprofits</h1>
        <p className="text-sm text-muted-foreground mt-1">Approved nonprofits in your region (read only)</p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>City</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
          <TableBody>
            {nonprofits.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No approved nonprofits found.</TableCell></TableRow>
            ) : nonprofits.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.organization_name}</TableCell>
                <TableCell>{n.primary_contact_email || "—"}</TableCell>
                <TableCell>{n.city || "—"}</TableCell>
                <TableCell>{n.state || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
