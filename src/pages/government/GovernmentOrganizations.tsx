import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatOrgType } from "@/lib/constants";
import { filterByRegion, type GovernmentRegions } from "@/lib/regionFilter";
import type { Organization } from "@/types/database";

// Government users should only see organizations that fall inside their
// assigned region (state / cities / counties). Previously this page queried
// every approved org in the platform, which meant a City of Orlando user
// could see organizations from Las Vegas and Oklahoma City. This version
// scopes the list to the government user's region.
export default function GovernmentOrganizations() {
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

  const { data: orgs = [] } = useQuery({
    queryKey: ["gov-orgs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("approval_status", "approved")
        .order("name");
      return (data || []) as Organization[];
    },
  });

  const filteredOrgs = useMemo(() => filterByRegion(orgs, regions), [orgs, regions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approved organizations in your assigned region (read only)
        </p>
      </div>
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No approved organizations found in your assigned region.
                </TableCell>
              </TableRow>
            ) : filteredOrgs.map((o) => (
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
