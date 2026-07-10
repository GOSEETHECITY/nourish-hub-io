import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type State = { state_code: string; state_name: string; law_name: string; description: string | null };

export default function VenueCompliance() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgState, setOrgState] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [states, setStates] = useState<State[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (profile?.organization_id) {
        setOrgId(profile.organization_id);
        const { data: org } = await supabase.from("organizations").select("state, name").eq("id", profile.organization_id).single();
        setOrgState(org.state ?? null);
        setOrgName(org.name);
      }
      const { data: cs } = await supabase.from("compliance_states").select("*").eq("active", true).order("state_name");
      setStates(cs ?? []);
    })();
  }, [user]);

  const applicable = states.find(s => s.state_code === orgState);

  async function downloadReport() {
    if (!orgId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-compliance-report", {
        body: { organization_id: orgId, year },
      });
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `compliance-${year}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate report");
    } finally {
      setBusy(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance</h1>
        <p className="text-muted-foreground">Track your obligations under state food-recovery laws.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Applicable state law</CardTitle></CardHeader>
        <CardContent>
          {applicable ? (
            <div className="space-y-2">
              <div className="text-xl font-medium">{applicable.state_name} — {applicable.law_name}</div>
              <p className="text-muted-foreground">{applicable.description}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No state-level food-recovery statute is currently tracked for {orgState ?? "your state"}.
              You can still generate a diversion summary below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Annual compliance report</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Reporting year</label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!orgId || busy} onClick={downloadReport}>
            {busy ? "Generating…" : "Download PDF"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Report is generated for <strong>{orgName || "your organization"}</strong> from live donation records.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All tracked state laws</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {states.map(s => (
              <li key={s.state_code} className="py-3">
                <div className="font-medium">{s.state_name} — {s.law_name}</div>
                {s.description && <div className="text-sm text-muted-foreground">{s.description}</div>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
