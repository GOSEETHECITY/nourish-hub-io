// Admin-only. Sends the "your account is ready" credentials email to a partner
// organization or nonprofit via Resend from noreply@hariet.ai. Marks
// credentials_sent_at on the entity so nothing is double-sent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { restrictedCors, alertFatalError, generateTempPassword } from "../_shared/ops.ts";

Deno.serve(async (req) => {
  const corsHeaders = restrictedCors(req);
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);


    const { targets } = await req.json() as { targets: Array<{ kind: "org" | "nonprofit"; id: string }> };
    if (!Array.isArray(targets) || !targets.length) return json({ error: "targets required" }, 400);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 500);

    const results: Array<{ id: string; status: "sent" | "skipped" | "failed"; reason?: string }> = [];

    for (const t of targets) {
      try {
        const table = t.kind === "nonprofit" ? "nonprofits" : "organizations";
        const nameCol = t.kind === "nonprofit" ? "organization_name" : "name";
        const { data: row } = await admin.from(table)
          .select(`id, ${nameCol}, join_code, primary_contact_email, primary_contact_name, credentials_sent_at`)
          .eq("id", t.id).maybeSingle();
        if (!row) { results.push({ id: t.id, status: "failed", reason: "not found" }); continue; }
        if ((row as any).credentials_sent_at) { results.push({ id: t.id, status: "skipped", reason: "already sent" }); continue; }
        const email = (row as any).primary_contact_email;
        const orgName = (row as any)[nameCol];
        const joinCode = (row as any).join_code;
        const contactName = (row as any).primary_contact_name || "there";
        if (!email) { results.push({ id: t.id, status: "failed", reason: "missing contact email" }); continue; }

        // Each organization gets its own random temp password.
        const { data: cred } = await admin.from("partner_credentials")
          .select("temp_password").eq("entity_kind", t.kind).eq("entity_id", t.id).maybeSingle();
        let password: string | null = cred?.temp_password ?? null;
        if (!password) {
          password = generateTempPassword();
          const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
          if (prof?.id) {
            await admin.auth.admin.updateUserById(prof.id, { password });
          } else {
            const { error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
            if (createErr && !/already/i.test(createErr.message)) {
              results.push({ id: t.id, status: "failed", reason: createErr.message }); continue;
            }
          }
          await admin.from("partner_credentials").upsert(
            { entity_kind: t.kind, entity_id: t.id, temp_password: password },
            { onConflict: "entity_kind,entity_id" },
          );
        }


        const dashboardUrl = t.kind === "nonprofit"
          ? "https://hariet.ai/nonprofit"
          : "https://hariet.ai/venue";
        const html = credentialsHtml({ orgName, contactName, email, password, joinCode, dashboardUrl });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "HarietAI <noreply@hariet.ai>",
            to: [email],
            subject: `Your ${orgName} account is ready on HarietAI`,
            html,
          }),
        });
        const body = await res.json();
        if (!res.ok) { results.push({ id: t.id, status: "failed", reason: JSON.stringify(body) }); continue; }
        await admin.from(table).update({ credentials_sent_at: new Date().toISOString() }).eq("id", t.id);
        results.push({ id: t.id, status: "sent" });
      } catch (e: any) {
        results.push({ id: t.id, status: "failed", reason: e?.message || String(e) });
      }
    }
    return json({ results });
  } catch (e: any) {
    await alertFatalError("send-partner-credentials", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});

function credentialsHtml(p: { orgName: string; contactName: string; email: string; password: string; joinCode: string; dashboardUrl: string }) {
  return `<div style="background:hsl(30,88%,9%);padding:40px 0;font-family:'DM Sans',Arial,sans-serif;color:#f5f0e6">
  <div style="max-width:600px;margin:0 auto;padding:0 20px">
    <h1 style="font-family:'Space Grotesk',Arial,sans-serif;color:#d4a03a;font-size:28px;margin:0 0 8px">HarietAI</h1>
    <p style="color:#c9a97a;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0 0 32px">Feed It Onward</p>
    <div style="background:#1a0f04;border:1px solid #3a2812;border-radius:16px;padding:32px">
      <h2 style="color:#d4a03a;font-family:'Space Grotesk',Arial,sans-serif;margin:0 0 16px">Welcome, ${p.contactName}</h2>
      <p style="font-size:16px;line-height:1.6;color:#e8dcc4">Your account for <strong>${p.orgName}</strong> is ready. Below are your login details.</p>
      <div style="background:#2c1803;border:1px solid #d4a03a;border-radius:12px;padding:20px;margin:24px 0">
        <p style="margin:0 0 12px"><strong style="color:#d4a03a">Email:</strong> ${p.email}</p>
        <p style="margin:0 0 12px"><strong style="color:#d4a03a">Temporary Password:</strong> <code style="background:#0e0602;padding:4px 8px;border-radius:4px;color:#f5deb3">${p.password}</code></p>
        <p style="margin:0"><strong style="color:#d4a03a">Location Join Code:</strong> <code style="background:#0e0602;padding:4px 8px;border-radius:4px;color:#f5deb3">${p.joinCode}</code></p>
      </div>
      <p style="font-size:14px;color:#c9a97a;line-height:1.6"><strong>Please change your password on first login.</strong> Share the join code with anyone else on your team who needs access.</p>
      <div style="text-align:center;margin:32px 0 8px">
        <a href="${p.dashboardUrl}" style="display:inline-block;background:#d4a03a;color:hsl(30,88%,9%);padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">Open your dashboard</a>
      </div>
    </div>
    <p style="text-align:center;color:#8a6d3f;font-size:12px;margin-top:24px">© ${new Date().getFullYear()} HarietAI</p>
  </div>
</div>`;
}

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}
