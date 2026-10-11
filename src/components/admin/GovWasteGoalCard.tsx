import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Admin-only: set the waste-reduction goal shown on a government partner's dashboard. */
export default function GovWasteGoalCard({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const db = supabase as any;
  const { data: goal } = useQuery({
    queryKey: ["gov-waste-goal", orgId],
    queryFn: async () => (await db.from("gov_waste_goals").select("*").eq("organization_id", orgId).maybeSingle()).data,
  });
  const y = new Date().getFullYear();
  const [f, setF] = useState({ goal_lbs: "", period_start: `${y}-01-01`, period_end: `${y}-12-31` });
  useEffect(() => { if (goal) setF({ goal_lbs: String(goal.goal_lbs), period_start: goal.period_start, period_end: goal.period_end }); }, [goal]);
  const save = async () => {
    if (!(Number(f.goal_lbs) > 0)) return toast.error("Enter a goal in pounds");
    if (f.period_end < f.period_start) return toast.error("End date must be after start date");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await db.from("gov_waste_goals").upsert({ organization_id: orgId, goal_lbs: Number(f.goal_lbs), period_start: f.period_start, period_end: f.period_end, set_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Waste goal saved");
    qc.invalidateQueries({ queryKey: ["gov-waste-goal"] });
  };
  return (
    <div className="bg-card rounded-xl border p-6 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Waste-reduction goal</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <div><Label>Goal (lbs diverted)</Label><Input type="number" min="1" value={f.goal_lbs} onChange={(e) => setF({ ...f, goal_lbs: e.target.value })} /></div>
        <div><Label>Start</Label><Input type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></div>
        <div><Label>End</Label><Input type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></div>
      </div>
      <Button onClick={save}>Save goal</Button>
    </div>
  );
}
