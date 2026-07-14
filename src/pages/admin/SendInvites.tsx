import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Target = { kind: "org" | "nonprofit"; id: string; name: string; email: string | null; contact_name: string | null; join_code: string; temp_password_hint: string | null; credentials_sent_at: string | null };

export default function SendInvites() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<Target | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: orgs }, { data: nps }] = await Promise.all([
      supabase.from("organizations").select("id, name, primary_contact_email, primary_contact_name, join_code, temp_password_hint, credentials_sent_at").not("primary_contact_email", "is", null),
      supabase.from("nonprofits").select("id, organization_name, primary_contact_email, primary_contact_name, join_code, temp_password_hint, credentials_sent_at").not("primary_contact_email", "is", null),
    ]);
    const merged: Target[] = [
      ...(orgs ?? []).map((o) => ({ kind: "org" as const, id: o.id, name: o.name, email: o.primary_contact_email, contact_name: o.primary_contact_name, join_code: o.join_code, temp_password_hint: o.temp_password_hint, credentials_sent_at: o.credentials_sent_at })),
      ...(nps ?? []).map((n) => ({ kind: "nonprofit" as const, id: n.id, name: n.organization_name, email: n.primary_contact_email, contact_name: n.primary_contact_name, join_code: n.join_code, temp_password_hint: n.temp_password_hint, credentials_sent_at: n.credentials_sent_at })),
    ];
    setTargets(merged.sort((a, b) => (a.credentials_sent_at ? 1 : 0) - (b.credentials_sent_at ? 1 : 0) || a.name.localeCompare(b.name)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const sendSelected = async () => {
    const picks = targets.filter((t) => selected.has(t.id));
    if (!picks.length) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-partner-credentials", {
      body: { targets: picks.map((p) => ({ kind: p.kind, id: p.id })) },
    });
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    const sent = (data?.results ?? []).filter((r: any) => r.status === "sent").length;
    toast({ title: "Sent", description: `${sent} credential email(s) delivered.` });
    setSelected(new Set());
    load();
  };

  const unsent = targets.filter((t) => !t.credentials_sent_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Send Invites</h1>
        <p className="text-muted-foreground text-sm mt-1">Send credential emails to imported organizations. Sent status is tracked so nothing goes twice.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ready to invite ({unsent.length})</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set(unsent.map((t) => t.id)))}>Select all unsent</Button>
            <Button size="sm" onClick={sendSelected} disabled={sending || !selected.size}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send {selected.size ? `(${selected.size})` : ""}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? "Loading…" : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Join code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t) => (
                  <TableRow key={t.id} className={t.credentials_sent_at ? "opacity-60" : ""}>
                    <TableCell><Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} disabled={!!t.credentials_sent_at} /></TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="capitalize">{t.kind}</TableCell>
                    <TableCell><div>{t.contact_name}</div><div className="text-xs text-muted-foreground">{t.email}</div></TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.join_code}</code></TableCell>
                    <TableCell>{t.credentials_sent_at ? <span className="text-xs text-green-700">Sent {new Date(t.credentials_sent_at).toLocaleDateString()}</span> : <span className="text-xs text-muted-foreground">Not sent</span>}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setPreview(t)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Email preview — {preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            <div className="border rounded-lg p-6 bg-[hsl(30,88%,9%)] text-[#f5f0e6] font-sans text-sm space-y-3">
              <p className="text-[#d4a03a] text-xl font-bold">HarietAI</p>
              <p><strong className="text-[#d4a03a]">To:</strong> {preview.email}</p>
              <p><strong className="text-[#d4a03a]">Subject:</strong> Your {preview.name} account is ready</p>
              <div className="border-t border-[#3a2812] pt-3">
                <p>Welcome, {preview.contact_name || "there"}.</p>
                <p className="mt-2">Login email: {preview.email}</p>
                <p>Temporary password: <code className="bg-black/40 px-2 rounded">{preview.temp_password_hint || "(missing)"}</code></p>
                <p>Location join code: <code className="bg-black/40 px-2 rounded">{preview.join_code}</code></p>
                <p className="mt-3 text-xs text-[#c9a97a]">Please change your password on first login.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
