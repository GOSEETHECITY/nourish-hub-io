import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const ISSUE_LABELS: Record<string, string> = {
  no_show: "Driver or venue no-show", wrong_items: "Wrong items", damaged: "Damaged or spoiled food",
  not_ready: "Donation not ready", unsafe: "Safety concern", other: "Other", missed_window: "Missed pickup window",
};

export default function ReportProblemDialog({ listingId, open, onOpenChange }: { listingId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { profile, user } = useAuth();
  const [type, setType] = useState("no_show");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!listingId || !profile?.nonprofit_id || !user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("pickup_issues").insert({
      food_listing_id: listingId, nonprofit_id: profile.nonprofit_id, issue_type: type,
      description: desc.trim() || null, source: "nonprofit", reported_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks — our team has been alerted and will follow up.");
    setDesc(""); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Report a problem</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>What happened?</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ISSUE_LABELS).filter(([k]) => k !== "missed_window").map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Details</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} /></div>
          <div className="flex justify-end"><Button onClick={submit} disabled={saving}>{saving ? "Sending..." : "Send report"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
