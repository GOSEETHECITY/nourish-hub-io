// Unified email + SMS alert dispatcher. Called from DB triggers and app code.
// Body: { user_ids?: string[], audience?: "admins", category: string,
//         subject: string, html?: string, text: string, urgent?: boolean }
// Auth: caller must be an admin (JWT + has_role) OR present X-Internal-Secret
// matching CRON_SECRET. Recipients are resolved server side from user ids only;
// arbitrary email/phone values are never accepted.
// Respects per-user notification_preferences. Uses Resend for email and Twilio
// (gateway) for SMS. Only sends SMS when { urgent: true }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { alertFatalError } from "../_shared/ops.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface AlertBody {
  user_ids?: string[];
  audience?: "admins";
  // Fallback: when no user_ids resolve, email the contact_email stored on this
  // onboarding_submissions row (read server side; never accepted from the caller).
  fallback_submission_id?: string;
  category: string;
  subject: string;
  html?: string;
  text: string;
  urgent?: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---- Authentication: internal secret OR admin user ----
    const internalExpected = Deno.env.get("CRON_SECRET") ?? "";
    const internalProvided = req.headers.get("x-internal-secret") ?? "";
    let authorized = !!internalExpected && internalProvided === internalExpected;
    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } });
      const { data: claims } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
      const sub = claims?.claims?.sub;
      if (!sub) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: sub, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      authorized = true;
    }

    const body = await req.json() as AlertBody;
    if (!body.category || !body.subject || !body.text) return json({ error: "category, subject, text required" }, 400);

    // ---- Resolve recipient user ids server side ----
    const ids = new Set<string>();
    if (Array.isArray(body.user_ids)) {
      for (const id of body.user_ids) {
        if (typeof id !== "string" || !UUID_RE.test(id)) return json({ error: "user_ids must be UUIDs" }, 400);
        ids.add(id);
      }
    }
    if (body.audience === "admins") {
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      for (const a of admins ?? []) ids.add(a.user_id);
    }
    const userIds = [...ids];
    const fallbackId = body.fallback_submission_id;
    if (fallbackId !== undefined && (typeof fallbackId !== "string" || !UUID_RE.test(fallbackId))) {
      return json({ error: "fallback_submission_id must be a UUID" }, 400);
    }
    if (!userIds.length && !fallbackId) return json({ error: "user_ids or audience required" }, 400);

    type Recipient = { email?: string; phone?: string; email_enabled: boolean; sms_enabled: boolean };
    const recipients: Recipient[] = [];

    if (!userIds.length && fallbackId) {
      const { data: sub } = await admin.from("onboarding_submissions").select("contact_email").eq("id", fallbackId).maybeSingle();
      const email = sub?.contact_email?.trim();
      if (email) recipients.push({ email, email_enabled: true, sms_enabled: false });
    }

    if (userIds.length) {
      const { data: profiles } = await admin.from("profiles").select("id, email, phone").in("id", userIds);
      const { data: prefs } = await admin.from("notification_preferences").select("user_id, email_enabled, sms_enabled")
        .in("user_id", userIds).eq("category", body.category);
      const prefMap = new Map((prefs ?? []).map((p) => [p.user_id, p]));
      for (const p of profiles ?? []) {
        const pref = prefMap.get(p.id);
        recipients.push({
          email: p.email ?? undefined,
          phone: p.phone ?? undefined,
          email_enabled: pref ? pref.email_enabled : true,
          sms_enabled: pref ? pref.sms_enabled : true,
        });
      }
    }

    let email_sent = 0, sms_sent = 0, email_failed = 0, sms_failed = 0;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");
    const html = body.html ?? `<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:hsl(30,88%,9%)">${escape(body.subject)}</h2><p>${escape(body.text)}</p></div>`;

    for (const r of recipients) {
      if (r.email && r.email_enabled && RESEND_API_KEY) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: "HarietAI <noreply@hariet.ai>", to: [r.email], subject: body.subject, html }),
          });
          if (res.ok) email_sent++; else email_failed++;
        } catch { email_failed++; }
      }
      if (body.urgent && r.phone && r.sms_enabled && LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_FROM) {
        try {
          const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TWILIO_API_KEY,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: r.phone, From: TWILIO_FROM, Body: `${body.subject}\n\n${body.text}`.slice(0, 1500) }),
          });
          if (res.ok) sms_sent++; else sms_failed++;
        } catch { sms_failed++; }
      }
    }

    return json({ recipients: recipients.length, email_sent, email_failed, sms_sent, sms_failed });
  } catch (e: any) {
    await alertFatalError("send-alert", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}
function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
