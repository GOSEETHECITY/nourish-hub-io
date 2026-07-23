// Supabase Auth "Send Email Hook" handler.
// Renders one of six branded templates and sends via Resend from noreply@hariet.ai.
//
// Configure in Supabase Dashboard → Authentication → Hooks → Send Email Hook:
//   URL:    https://yaicfjdquvfifwtfpmbm.functions.supabase.co/auth-email-hook
//   Secret: (paste into SEND_EMAIL_HOOK_SECRET project secret)
//
// Requires: RESEND_API_KEY (set), hariet.ai verified in Resend.

import { Webhook } from "npm:standardwebhooks@1.0.0";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, stripe-signature" };

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET"); // v1,whsec_...

const FROM = "HarietAI <noreply@hariet.ai>";

// -------------- Brand template --------------
function shell(title: string, preheader: string, bodyHtml: string, cta?: { url: string; label: string }) {
  const btn = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-radius:10px;background:#C9A24B;">
        <a href="${cta.url}" style="display:inline-block;padding:14px 28px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#1a0f04;text-decoration:none;border-radius:10px;">${cta.label}</a>
      </td></tr></table>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0d0a06;font-family:'DM Sans',Arial,sans-serif;color:#e8ddc7;">
<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0a06;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#17110a;border:1px solid #2a1f14;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:32px 40px 8px;">
        <div style="font-family:'Space Grotesk','DM Sans',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#C9A24B;">HarietAI</div>
      </td></tr>
      <tr><td style="padding:8px 40px 40px;">
        <h1 style="font-family:'Space Grotesk',Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:700;color:#f5ebd5;margin:16px 0 12px;">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#c9bfa7;">${bodyHtml}</div>
        ${btn}
        <p style="font-size:12px;color:#8a7f68;margin-top:32px;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:20px 40px 32px;border-top:1px solid #2a1f14;font-size:12px;color:#8a7f68;">
        HarietAI · Recovering surplus food, feeding communities.<br>
        <a href="https://hariet.ai" style="color:#C9A24B;text-decoration:none;">hariet.ai</a>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

type Action =
  | "signup" | "recovery" | "magiclink" | "invite"
  | "email_change" | "email_change_current" | "email_change_new" | "reauthentication";

function pickTemplate(action: Action, meta: {
  confirmUrl: string;
  token: string;
  email: string;
  orgName?: string;
}): { subject: string; html: string } {
  const { confirmUrl, token, email, orgName } = meta;
  switch (action) {
    case "signup":
      return {
        subject: "Welcome to HarietAI",
        html: shell("Welcome to HarietAI", "Confirm your email to get started",
          `<p>Welcome aboard. Confirm your email address to activate your account and start recovering surplus food.</p>`,
          { url: confirmUrl, label: "Confirm my email" }),
      };
    case "recovery":
      return {
        subject: "Reset your password",
        html: shell("Reset your password", "Use the link below to set a new one",
          `<p>We received a request to reset the password for <strong style="color:#f5ebd5;">${email}</strong>. This link expires in 60 minutes.</p>`,
          { url: confirmUrl, label: "Reset password" }),
      };
    case "magiclink":
      return {
        subject: "Your sign-in link",
        html: shell("Sign in to HarietAI", "One-tap sign-in",
          `<p>Click below to sign in. This link works once and expires shortly.</p>`,
          { url: confirmUrl, label: "Sign in" }),
      };
    case "invite":
      return {
        subject: orgName ? `You're invited to join ${orgName}` : "You're invited to HarietAI",
        html: shell(orgName ? `Join ${orgName}` : "Join HarietAI", "Accept your invitation",
          `<p>You've been invited to collaborate on HarietAI${orgName ? ` with <strong style="color:#f5ebd5;">${orgName}</strong>` : ""}. Accept your invitation to set your password.</p>`,
          { url: confirmUrl, label: "Accept invitation" }),
      };
    case "email_change":
    case "email_change_current":
    case "email_change_new":
      return {
        subject: "Confirm your email change",
        html: shell("Confirm email change", "Verify the new address",
          `<p>Confirm this change to update the email on your HarietAI account.</p>`,
          { url: confirmUrl, label: "Confirm change" }),
      };
    case "reauthentication":
      return {
        subject: "Your verification code",
        html: shell("Verify it's you", "Enter this code to continue",
          `<p>Use this code to complete verification. It expires in 10 minutes.</p>
           <div style="font-family:'Space Grotesk',monospace;font-size:32px;letter-spacing:6px;color:#C9A24B;background:#0d0a06;border:1px solid #2a1f14;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">${token}</div>`),
      };
    default:
      return {
        subject: "HarietAI notification",
        html: shell("HarietAI", "", `<p>You have a new HarietAI notification.</p>`,
          confirmUrl ? { url: confirmUrl, label: "Open" } : undefined),
      };
  }
}

async function sendResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body}`);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const raw = await req.text();
    let payload: any;

    if (HOOK_SECRET) {
      const headers = Object.fromEntries(req.headers);
      const wh = new Webhook(HOOK_SECRET.replace("v1,whsec_", "").replace("whsec_", ""));
      payload = wh.verify(raw, headers);
    } else {
      payload = JSON.parse(raw);
    }

    const user = payload.user ?? {};
    const d = payload.email_data ?? {};
    const action: Action = d.email_action_type ?? "signup";
    
    // Resolve email from all possible payload locations for phone OTP users
    let email = user.email ?? d.new_email ?? d.user_email ?? payload.email ?? user.user_metadata?.email ?? "";
    
    // For email_change actions, determine which email to send to
    if (action === "email_change_current") {
      email = user.email ?? ""; // current email
    } else if (action === "email_change" || action === "email_change_new") {
      email = d.new_email ?? user.email ?? ""; // new email, fallback to current
    }
    
    // Skip if no valid recipient found (don't fail the auth operation)
    if (!email || !email.trim()) {
      console.warn("auth-email-hook skipped: no email found in payload for action", action);
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const confirmUrl = d.redirect_to
      ? `${d.site_url ?? "https://hariet.ai"}/auth/callback?token_hash=${d.token_hash}&type=${action}&next=${encodeURIComponent(d.redirect_to)}`
      : `${d.site_url ?? "https://hariet.ai"}/auth/callback?token_hash=${d.token_hash}&type=${action}`;

    const tpl = pickTemplate(action, {
      confirmUrl,
      token: d.token ?? "",
      email,
      orgName: user.user_metadata?.organization_name,
    });

    await sendResend(email, tpl.subject, tpl.html);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("auth-email-hook error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
