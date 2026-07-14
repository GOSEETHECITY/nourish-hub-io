import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function PendingApprovals() {
  const [subs, setSubs] = useState<any[]>([]);
  const [rejectFor, setRejectFor] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    const { data } = await supabase.from("onboarding_submissions").select("*").eq("status", "pending").order("created_at", { ascending: false });
    setSubs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (s: any) => {
    // Verify EIN for nonprofits, then create the org via bulk-import
    const rows = [{
      organization_name: s.organization_name, organization_type: s.organization_type,
      address: s.address, city: s.city, state: s.state, zip_code: s.zip_code,
      contact_name: s.contact_name, contact_email: s.contact_email, contact_phone: s.contact_phone, ein: s.ein,
    }];
    let data: any;
    try {
      const { callBulkImport } = await import("@/lib/callBulkImport");
      data = await callBulkImport({ rows });
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message || String(e), variant: "destructive" }); return;
    }
    if (!data?.results?.[0] || data.results[0].status !== "created") {
      toast({ title: "Approve failed", description: data?.results?.[0]?.reason || "Unknown error", variant: "destructive" }); return;
    }
    const created = data.results[0];
    // Send the credentials email immediately
    await supabase.functions.invoke("send-partner-credentials", { body: { targets: [{ kind: s.organization_type === "nonprofit" ? "nonprofit" : "org", id: created.id }] } });
    await supabase.from("onboarding_submissions").update({
      status: "approved", reviewed_at: new Date().toISOString(),
      created_organization_id: s.organization_type === "nonprofit" ? null : created.id,
      created_nonprofit_id: s.organization_type === "nonprofit" ? created.id : null,
    }).eq("id", s.id);
    toast({ title: "Approved & emailed", description: `${s.organization_name} created with join code ${created.join_code}.` });
    load();
  };

  const doReject = async () => {
    if (!rejectFor || !reason.trim()) return;
    await supabase.from("onboarding_submissions").update({ status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString() }).eq("id", rejectFor.id);
    await supabase.functions.invoke("send-alert", {
      body: {
        to_email: rejectFor.contact_email, category: "onboarding_rejected", urgent: false,
        subject: "Update on your HarietAI application",
        text: `Hi ${rejectFor.contact_name}, we reviewed your application for ${rejectFor.organization_name} and could not approve it at this time. Reason: ${reason}. You are welcome to reply and provide additional detail.`,
      },
    });
    setRejectFor(null); setReason(""); load();
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Pending partner applications</h1></div>
      <Card>
        <CardHeader><CardTitle>{subs.length} awaiting review</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead><TableHead>Location</TableHead><TableHead>EIN</TableHead><TableHead>Submitted</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.organization_name}</TableCell>
                  <TableCell className="capitalize">{s.organization_type.replace(/_/g, " ")}</TableCell>
                  <TableCell><div>{s.contact_name}</div><div className="text-xs text-muted-foreground">{s.contact_email}</div></TableCell>
                  <TableCell>{s.city}, {s.state}</TableCell>
                  <TableCell>{s.ein || "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setRejectFor(s)}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    <Button size="sm" onClick={() => approve(s)}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!subs.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No pending applications.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reject {rejectFor?.organization_name}?</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (emailed to applicant)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button onClick={doReject} disabled={!reason.trim()}>Confirm reject & email</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
