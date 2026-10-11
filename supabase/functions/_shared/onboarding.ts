// Shared helpers for the self-serve partner onboarding functions.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

export const APP_URL = "https://hariet.ai";
const ORIGIN_OK = (o: string) =>
  /^https:\/\/(www\.)?(hariet\.ai|goseethecity\.com)$/.test(o) || /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(o) ||
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);

export function onboardingCors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGIN_OK(origin) ? origin : APP_URL,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export const serviceClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export async function callerUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const c = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await c.auth.getUser();
  return data.user ?? null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Sends a simple branded email through Resend. Never throws. */
export async function sendEmail(to: string, subject: string, paragraphs: string[], cta?: { label: string; url: string }) {
  try {
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key || !to) return false;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#000">
      <h2 style="color:#6d412a">Hariet.AI</h2>
      ${paragraphs.map((p) => `<p style="line-height:1.5">${esc(p)}</p>`).join("")}
      ${cta ? `<p><a href="${esc(cta.url)}" style="display:inline-block;background:#6d412a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${esc(cta.label)}</a></p>` : ""}
      <p style="color:#666;font-size:12px">Questions? Reply to hello@hariet.ai.</p></div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "HarietAI <noreply@hariet.ai>", to: [to], subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

/** In-app admin notification + email to the ops inbox. */
export async function alertAdmins(db: SupabaseClient, type: "new_signup" | "system", title: string, description: string, link = "/admin/onboarding") {
  await db.from("admin_notifications").insert({ type, title, description, link });
  await sendEmail(Deno.env.get("ALERT_EMAIL") || "hello@goseethecity.com", title, [description], { label: "Open review queue", url: `${APP_URL}${link}` });
}

export type EinCheck = { status: "verified" | "needs_help"; reason: string; name?: string; subsection?: number | null; raw?: unknown; transient?: boolean };

/** Checks an EIN against ProPublica Nonprofit Explorer (IRS data). 501(c)(3) = subsection 3. */
export async function checkEin(einRaw: string): Promise<EinCheck> {
  const ein = einRaw.replace(/\D/g, "");
  if (ein.length !== 9) return { status: "needs_help", reason: "EIN must be 9 digits." };
  try {
    const res = await fetch(`https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`, {
      headers: { "User-Agent": "HarietAI onboarding (hello@hariet.ai)" },
    });
    if (res.status === 404) return { status: "needs_help", reason: "EIN not found in IRS exempt organization records." };
    if (!res.ok) return { status: "needs_help", reason: `Verification service unavailable (${res.status}).`, transient: true };
    const body = await res.json();
    const org = body?.organization ?? {};
    const sub = typeof org.subsection_code === "number" ? org.subsection_code : Number(org.subsection_code ?? NaN);
    const raw = { name: org.name, city: org.city, state: org.state, subsection_code: sub, ntee_code: org.ntee_code, ruling_date: org.ruling_date, deductibility_code: org.deductibility_code, checked_at: new Date().toISOString() };
    if (sub === 3) return { status: "verified", reason: "Confirmed 501(c)(3) in IRS records.", name: org.name, subsection: sub, raw };
    return { status: "needs_help", reason: Number.isFinite(sub) ? `Listed as 501(c)(${sub}), not 501(c)(3).` : "Exempt status could not be confirmed.", name: org.name, subsection: Number.isFinite(sub) ? sub : null, raw };
  } catch (e) {
    return { status: "needs_help", reason: `Verification service error: ${(e as Error).message}`, transient: true };
  }
}

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const resumeUrl = (token: string) => `${APP_URL}/partner-apply?resume=${token}`;

/** Picks the current agreement for an application: org-specific override first, then the standard template. */
export async function currentTemplate(db: SupabaseClient, app: { org_kind: string; created_organization_id?: string | null; created_nonprofit_id?: string | null }) {
  if (app.created_organization_id || app.created_nonprofit_id) {
    const col = app.created_nonprofit_id ? "nonprofit_id" : "organization_id";
    const { data } = await db.from("agreement_templates").select("*").eq(col, app.created_nonprofit_id ?? app.created_organization_id)
      .eq("is_current", true).order("version", { ascending: false }).limit(1).maybeSingle();
    if (data) return data;
  }
  const { data } = await db.from("agreement_templates").select("*").eq("org_kind", app.org_kind)
    .is("organization_id", null).is("nonprofit_id", null).eq("is_current", true)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export type DocSlot = { key: string; label: string; required: boolean; org_kinds: string[]; needs_expiry: boolean };
export const INSURANCE_SLOT: DocSlot = { key: "insurance", label: "Certificate of insurance", required: true, org_kinds: ["venue", "nonprofit", "one_time_event"], needs_expiry: true };

export async function docSlots(db: SupabaseClient, kind: string): Promise<DocSlot[]> {
  const { data } = await db.from("app_config").select("value").eq("key", "partner_document_slots").maybeSingle();
  let extra: DocSlot[] = [];
  try { extra = data?.value ? JSON.parse(data.value) : []; } catch { extra = []; }
  return [INSURANCE_SLOT, ...extra.filter((s) => s.key !== "insurance" && (s.org_kinds ?? []).includes(kind))];
}

/** Recomputes docs_status from the application's documents. */
export async function refreshDocsStatus(db: SupabaseClient, app: { id: string; org_kind: string }) {
  const slots = (await docSlots(db, app.org_kind)).filter((s) => s.required);
  const { data: docs } = await db.from("partner_documents").select("doc_type,status").eq("application_id", app.id).neq("status", "superseded");
  const list = docs ?? [];
  let status: "missing" | "submitted" | "approved" | "rejected" = "approved";
  for (const s of slots) {
    const d = list.filter((x) => x.doc_type === s.key);
    if (!d.length) { status = "missing"; break; }
    if (d.some((x) => x.status === "rejected") && !d.some((x) => x.status !== "rejected")) { status = "rejected"; break; }
    if (!d.some((x) => x.status === "approved")) status = "submitted";
  }
  await db.from("partner_applications").update({ docs_status: status }).eq("id", app.id);
  return status;
}

/**
 * Creates the pending organization/nonprofit, the applicant's login (no password)
 * and emails a one-time set-password link. Idempotent per application.
 */
export async function provisionAccount(db: SupabaseClient, app: any) {
  let orgId = app.created_organization_id as string | null;
  let npId = app.created_nonprofit_id as string | null;
  if (app.org_kind === "nonprofit" && !npId) {
    const { data, error } = await db.from("nonprofits").insert({
      organization_name: app.organization_name, ein: app.ein?.replace(/\D/g, "") || null,
      primary_contact_name: app.contact_name, primary_contact_email: app.contact_email, primary_contact_phone: app.contact_phone,
      address: app.address, city: app.city, state: app.state, zip: app.zip, approval_status: "pending", is_verified: false,
    }).select("id").single();
    if (error) throw error;
    npId = data.id;
    await db.from("nonprofit_locations").insert({ nonprofit_id: npId, name: app.organization_name, address: app.address, city: app.city, state: app.state, zip: app.zip, approval_status: "pending", contact_name: app.contact_name, contact_email: app.contact_email, contact_phone: app.contact_phone });
  } else if (app.org_kind !== "nonprofit" && !orgId) {
    const isEvent = app.org_kind === "one_time_event";
    const { data, error } = await db.from("organizations").insert({
      name: app.organization_name, type: isEvent ? "event" : (app.organization_type || "restaurant"),
      primary_contact_name: app.contact_name, primary_contact_email: app.contact_email, primary_contact_phone: app.contact_phone,
      address: app.address, city: app.city, state: app.state, zip: app.zip, approval_status: "pending",
      is_one_time_event: isEvent, event_name: isEvent ? app.event_name : null, event_date: isEvent ? app.event_date : null,
    }).select("id").single();
    if (error) throw error;
    orgId = data.id;
    await db.from("locations").insert({ organization_id: orgId, name: app.organization_name, address: app.address, city: app.city, state: app.state, zip: app.zip, approval_status: "pending", contact_name: app.contact_name, contact_email: app.contact_email, contact_phone: app.contact_phone });
  }

  // Login: create or reuse the user by email.
  const email = String(app.contact_email).toLowerCase();
  let userId = app.applicant_user_id as string | null;
  if (!userId) {
    const created = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { first_name: app.contact_name?.split(" ")[0] ?? "", last_name: app.contact_name?.split(" ").slice(1).join(" ") ?? "", partner_onboarding: true } });
    if (created.data?.user) userId = created.data.user.id;
    else {
      const { data: prof } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
      if (!prof) throw new Error(created.error?.message || "Could not create login");
      userId = prof.id;
    }
  }
  const role = app.org_kind === "nonprofit" ? "nonprofit_partner" : "venue_partner";
  const { data: hasRole } = await db.from("user_roles").select("id").eq("user_id", userId).eq("role", role).maybeSingle();
  if (!hasRole) await db.from("user_roles").insert({ user_id: userId, role });
  await db.from("profiles").upsert({
    id: userId, email, first_name: app.contact_name?.split(" ")[0] ?? null, last_name: app.contact_name?.split(" ").slice(1).join(" ") || null,
    phone: app.contact_phone, organization_id: orgId, nonprofit_id: npId, must_change_password: true,
  });
  if (npId) await db.from("nonprofits").update({ user_id: userId }).eq("id", npId).is("user_id", null);

  await db.from("partner_applications").update({ created_organization_id: orgId, created_nonprofit_id: npId, applicant_user_id: userId }).eq("id", app.id);
  await db.from("agreement_signatures").update({ organization_id: orgId, nonprofit_id: npId }).eq("application_id", app.id);
  await db.from("partner_documents").update({ organization_id: orgId, nonprofit_id: npId }).eq("application_id", app.id);

  const { data: link } = await db.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${APP_URL}/reset-password` } });
  const url = link?.properties?.action_link;
  if (url) {
    await sendEmail(email, "Set your Hariet.AI password", [
      `Hi ${app.contact_name}, your Hariet.AI partner account for ${app.organization_name} is set up and pending review.`,
      "Use this secure one-time link to choose your password. The link expires soon and can only be used once.",
    ], { label: "Set my password", url });
  }
  return { orgId, npId, userId };
}
