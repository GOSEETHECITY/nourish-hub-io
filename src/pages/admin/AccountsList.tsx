import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = { email: string; role: string; org: string; join_code: string; password_hint: string; login_url: string };

export default function AccountsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: roles }, { data: orgs }, { data: nps }, { data: consumers }] = await Promise.all([
        supabase.from("profiles").select("id, email, organization_id, nonprofit_id"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("organizations").select("id, name, join_code, temp_password_hint"),
        supabase.from("nonprofits").select("id, organization_name, join_code, temp_password_hint"),
        supabase.from("consumers").select("email"),
      ]);
      const roleMap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => { const arr = roleMap.get(r.user_id) ?? []; arr.push(r.role); roleMap.set(r.user_id, arr); });
      const orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));
      const npMap = new Map((nps ?? []).map((n) => [n.id, n]));
      const partnerRows: Row[] = (profiles ?? []).map((p) => {
        const role = (roleMap.get(p.id) ?? []).join(", ") || "member";
        const org = p.organization_id ? orgMap.get(p.organization_id) : null;
        const np = p.nonprofit_id ? npMap.get(p.nonprofit_id) : null;
        return {
          email: p.email ?? "—",
          role,
          org: org?.name || np?.organization_name || "—",
          join_code: org?.join_code || np?.join_code || "",
          password_hint: org?.temp_password_hint || np?.temp_password_hint || (role.includes("admin") ? "reset required" : "reset required"),
          login_url: role.includes("admin") ? "https://hariet.ai/login" : (np ? "https://hariet.ai/login" : "https://hariet.ai/login"),
        };
      });
      const consumerRows: Row[] = (consumers ?? []).filter((c) => c.email).map((c) => ({
        email: c.email!, role: "consumer", org: "GO See The City", join_code: "", password_hint: "reset required", login_url: "https://goseethecity.com/app/login",
      }));
      setRows([...partnerRows, ...consumerRows].sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email)));
    })();
  }, []);

  const filtered = rows.filter((r) => !q || Object.values(r).some((v) => String(v).toLowerCase().includes(q.toLowerCase())));

  const exportCSV = () => {
    const header = ["email", "role", "organization", "join_code", "password", "login_url"];
    const csv = [header.join(","), ...filtered.map((r) => [r.email, r.role, r.org, r.join_code, r.password_hint, r.login_url].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `accounts_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Platform Accounts</h1>
        <p className="text-muted-foreground text-sm mt-1">Every user, role, and login. Passwords are shown only for newly imported accounts — older accounts store bcrypt hashes so plaintext is unrecoverable.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Accounts ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Join Code</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Login URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell className="capitalize">{r.role.replace(/_/g, " ")}</TableCell>
                    <TableCell>{r.org}</TableCell>
                    <TableCell>{r.join_code ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.join_code}</code> : "—"}</TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.password_hint}</code></TableCell>
                    <TableCell><a className="text-primary underline text-xs" href={r.login_url} target="_blank" rel="noreferrer">{r.login_url}</a></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
