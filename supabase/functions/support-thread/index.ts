// Two-way support messaging. Handles replies and admin status changes on a
// support request, writes system entries to the timeline, and emails the other
// participant (never the sender).
import { createClient } from "npm:@supabase/supabase-js@2";
import { alertFatalError, escapeHtml, makeRateLimiter, clientIp } from "../_shared/ops.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FN = "support-thread";
const limiter = makeRateLimiter(20, 60_000);

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  resolved: "Resolved",
};

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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    const payload = await req.json().catch(() => ({}));
    const requestId = typeof payload.request_id === "string" ? payload.request_id : "";
    const action = payload.action === "status" ? "status" : "reply";
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    if (!requestId) return json({ error: "request_id required" }, 400);

    const { data: request } = await admin.from("support_requests").select("*").eq("id", requestId).maybeSingle();
    if (!request) return json({ error: "Request not found" }, 404);
    if (!isAdmin && request.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const { data: profile } = await admin
      .from("profiles").select("first_name, last_name, email").eq("id", user.id).maybeSingle();
    const senderName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
      profile?.email || user.email || "User";
    const senderRole = isAdmin ? "admin" : "partner";

    let emailSubjectPrefix = "";
    let emailBody = "";
    let reopened = false;

    if (action === "status") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      if (!STATUS_LABEL[status]) return json({ error: "Invalid status" }, 400);
      await admin.from("support_requests").update({ status }).eq("id", requestId);
      await admin.from("support_messages").insert({
        support_request_id: requestId,
        sender_user_id: user.id,
        sender_name: senderName,
        sender_role: "system",
        is_system: true,
        body: `Status changed to ${STATUS_LABEL[status]} by ${senderName}`,
      });
      await admin.from("support_requests").update({ admin_last_viewed_at: new Date().toISOString() }).eq("id", requestId);
      emailSubjectPrefix = "Status update";
      emailBody = `Status changed to ${STATUS_LABEL[status]} by ${senderName}`;
    } else {
      if (!body || body.length < 2 || body.length > 5000) {
        return json({ error: "Please enter a message between 2 and 5000 characters." }, 400);
      }
      await admin.from("support_messages").insert({
        support_request_id: requestId,
        sender_user_id: user.id,
        sender_name: senderName,
        sender_role: senderRole,
        body,
      });
      // A requester replying to a resolved request reopens it.
      if (!isAdmin && request.status === "resolved") {
        reopened = true;
        await admin.from("support_requests").update({ status: "new" }).eq("id", requestId);
        await admin.from("support_messages").insert({
          support_request_id: requestId,
          sender_user_id: user.id,
          sender_name: senderName,
          sender_role: "system",
          is_system: true,
          body: `Request reopened by ${senderName}`,
        });
      }
      const viewedCol = isAdmin ? "admin_last_viewed_at" : "user_last_viewed_at";
      await admin.from("support_requests").update({ [viewedCol]: new Date().toISOString() }).eq("id", requestId);
      emailSubjectPrefix = "New reply";
      emailBody = body;
    }

    // Notify the other participant only.
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL") || "hello@goseethecity.com";
    const orgName = request.organization_name || "a partner";
    const to = isAdmin ? (request.email as string | null) : ALERT_EMAIL;
    const link = isAdmin
      ? "https://hariet.ai/venue/support"
      : `https://hariet.ai/support?request=${requestId}`;

    if (RESEND_API_KEY && to) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "HarietAI Support <noreply@hariet.ai>",
          to: [to],
          reply_to: isAdmin ? ALERT_EMAIL : (profile?.email ?? user.email ?? undefined),
          subject: `${emailSubjectPrefix}: ${request.subject} — ${orgName}${reopened ? " (reopened)" : ""}`,
          html: `<div style="font-family:Arial,sans-serif">
            <h2>${escapeHtml(emailSubjectPrefix)} on your support request</h2>
            <p><strong>Request:</strong> ${escapeHtml(String(request.subject))}</p>
            <p><strong>Organization:</strong> ${escapeHtml(String(orgName))}</p>
            <p><strong>From:</strong> ${escapeHtml(senderName)} (${escapeHtml(senderRole)})</p>
            <hr/>
            <p style="white-space:pre-wrap">${escapeHtml(emailBody)}</p>
            <p><a href="${link}">Open the conversation</a></p>
          </div>`,
        }),
      }).catch(() => {});
    }

    return json({ ok: true, reopened });
  } catch (e) {
    await alertFatalError(FN, e);
    return json({ error: String(e) }, 500);
  }
});
