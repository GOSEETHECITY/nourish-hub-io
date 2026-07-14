// Unified email + SMS alert dispatcher. Called from DB triggers and app code.
// Body: { user_ids?: string[], to_email?: string, to_phone?: string, category: string,
//         subject: string, html?: string, text: string, urgent?: boolean }
// Respects per-user notification_preferences. Uses Resend for email and Twilio
// (gateway) for SMS. Only sends SMS when { urgent: true }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertBody {
  user_ids?: string[];
  to_email?: string;
  to_phone?: string;
  category: string;
  subject: string;
  html?: string;
  text: string;
  urgent?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json() as AlertBody;
    if (!body.category || !body.subject || !body.text) return json({ error: "category, subject, text required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    type Recipient = { email?: string; phone?: string; email_enabled: boolean; sms_enabled: boolean };
    const recipients: Recipient[] = [];

    if (body.user_ids?.length) {
      const { data: profiles } = await admin.from("profiles").select("id, email, phone").in("id", body.user_ids);
      const { data: prefs } = await admin.from("notification_preferences").select("user_id, email_enabled, sms_enabled")
        .in("user_id", body.user_ids).eq("category", body.category);
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
    if (body.to_email || body.to_phone) {
      recipients.push({ email: body.to_email, phone: body.to_phone, email_enabled: true, sms_enabled: true });
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
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}
function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
