// Partner support form. Authenticated partners submit a message; it is stored in
// support_requests and emailed to hello@goseethecity.com.
import { createClient } from "npm:@supabase/supabase-js@2";
import { alertFatalError, escapeHtml, makeRateLimiter, clientIp } from "../_shared/ops.ts";

// Authenticated endpoint reachable from every partner dashboard origin.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FN = "submit-support-request";
const limiter = makeRateLimiter(5, 60_000);

Deno.serve(async (req) => {
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (limiter(clientIp(req))) return json({ error: "Too many requests. Please try again shortly." }, 429);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "Support request";
    const organization_name = typeof body.organization_name === "string" ? body.organization_name.trim().slice(0, 200) : "";
    const user_name = typeof body.user_name === "string" ? body.user_name.trim().slice(0, 200) : "";
    if (!message || message.length < 5 || message.length > 5000) {
      return json({ error: "Please enter a message between 5 and 5000 characters." }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("email, phone, first_name, last_name").eq("id", user.id).maybeSingle();

    await admin.from("support_requests").insert({
      user_id: user.id,
      organization_name: organization_name || null,
      user_name: user_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null,
      email: profile?.email ?? user.email ?? null,
      phone: profile?.phone ?? null,
      subject,
      message,
      status: "new",
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL") || "hello@goseethecity.com";
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "HarietAI Support <noreply@hariet.ai>",
          to: [ALERT_EMAIL],
          reply_to: profile?.email ?? user.email ?? undefined,
          subject: `Support Request from ${organization_name || user_name || "a partner"}`,
          html: `<div style="font-family:Arial,sans-serif">
            <h2>Support Request</h2>
            <p><strong>Organization:</strong> ${escapeHtml(organization_name || "—")}</p>
            <p><strong>From:</strong> ${escapeHtml(user_name || "—")} (${escapeHtml(profile?.email ?? user.email ?? "—")})</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
            <hr/>
            <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
          </div>`,
        }),
      }).catch(() => {});
    }

    return json({ ok: true });
  } catch (e) {
    await alertFatalError(FN, e);
    return json({ error: String(e) }, 500);
  }
});
