import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatOrgType } from "@/lib/constants";
import type { Organization } from "@/types/database";

export default function GovernmentOrganizations() {
  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("*").eq("approval_status", "approved").order("name");
      return (data || []) as Organization[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <p className="text-sm text-muted-foreground mt-1">Approved organizations in your region (read only)</p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>City</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No approved organizations found.</TableCell></TableRow>
            ) : orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell>{formatOrgType(o.type)}</TableCell>
                <TableCell>{o.city || "—"}</TableCell>
                <TableCell>{o.state || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
