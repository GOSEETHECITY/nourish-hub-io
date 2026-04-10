import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filterByRegion, type GovernmentRegions } from "@/lib/regionFilter";
import type { Nonprofit, Organization } from "@/types/database";

// Government users should only see nonprofits in their assigned region.
// Previously every approved nonprofit was shown regardless of where the gov
// user was scoped.
export default function GovernmentNonprofits() {
  const { profile } = useAuth();

  const { data: myOrg } = useQuery({
    queryKey: ["my-gov-org", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile!.organization_id!)
        .single();
      return data as (Organization & { government_regions?: any }) | null;
    },
    enabled: !!profile?.organization_id,
  });

  const regions = (myOrg?.government_regions as GovernmentRegions) ?? null;

  const { data: nonprofits = [] } = useQuery({
    queryKey: ["gov-nonprofits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nonprofits")
        .select("*")
        .eq("approval_status", "approved")
        .order("organization_name");
      return (data || []) as Nonprofit[];
    },
  });

  const filteredNonprofits = useMemo(() => filterByRegion(nonprofits, regions), [nonprofits, regions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nonprofits</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approved nonprofits in your assigned region (read only)
        </p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNonprofits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No approved nonprofits found in your assigned region.
                </TableCell>
              </TableRow>
            ) : filteredNonprofits.map((n) => (
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
