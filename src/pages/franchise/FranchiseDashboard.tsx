import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

type ChildOrg = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  pounds: number;
  donations: number;
};

/** Franchise / parent-org rollup dashboard. Shown when the authenticated user's
 *  organization has franchisee organizations linked via parent_organization_id. */
export default function FranchiseDashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ChildOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!profile?.organization_id) { setLoading(false); return; }
      const { data: parent } = await supabase.from("organizations").select("name").eq("id", profile.organization_id).single();
      setParentName(parent.name);

      const { data: children } = await supabase
        .from("organizations")
        .select("id, name, city, state")
        .eq("parent_organization_id", profile.organization_id);

      const enriched: ChildOrg[] = [];
      for (const c of children ?? []) {
        const { data: listings } = await supabase
          .from("food_listings")
          .select("pounds")
          .eq("organization_id", c.id)
          .in("status", ["picked_up", "pending_impact_report", "completed"]);
        enriched.push({
          id: c.id,
          name: c.name,
          city: c.city,
          state: c.state,
          pounds: (listings ?? []).reduce((s, l: any) => s + Number(l.pounds ?? 0), 0),
          donations: (listings ?? []).length,
        });
      }
      setRows(enriched.sort((a, b) => b.pounds - a.pounds));
      setLoading(false);
    })();
  }, [user]);

  const totalPounds = rows.reduce((s, r) => s + r.pounds, 0);
  const totalDonations = rows.reduce((s, r) => s + r.donations, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{parentName || "Franchise"} — Rollup</h1>
        <p className="text-muted-foreground">Combined view of all franchisee organizations under your parent org.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Franchisees</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{rows.length}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total donations</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{totalDonations.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle>Pounds diverted</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{Math.round(totalPounds).toLocaleString()}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By franchisee</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Loading…</div> : rows.length === 0 ? (
            <div className="text-muted-foreground">No franchisee organizations linked to this parent yet.</div>
          ) : (
            <ul className="divide-y">
              {rows.map(r => (
                <li key={r.id} className="flex justify-between py-3">
                  <div>
                    <Link to={`/organizations/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                    <div className="text-sm text-muted-foreground">{[r.city, r.state].filter(Boolean).join(", ")}</div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{Math.round(r.pounds).toLocaleString()} lbs</div>
                    <div className="text-muted-foreground">{r.donations} donations</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
