// Applicant-facing self-serve onboarding. Callers identify their application with
// the emailed resume token, or (once their login exists) their signed-in session.
import { z } from "npm:zod@3.23.8";
import {
  onboardingCors, serviceClient, callerUser, sendEmail, alertAdmins, checkEin, sha256Hex,
  resumeUrl, currentTemplate, docSlots, refreshDocsStatus, provisionAccount,
} from "../_shared/onboarding.ts";

const Basics = z.object({
  org_kind: z.enum(["venue", "nonprofit", "one_time_event"]),
  organization_type: z.string().trim().max(60).optional().nullable(),
  organization_name: z.string().trim().min(2).max(200),
  contact_name: z.string().trim().min(2).max(120),
  contact_title: z.string().trim().max(120).optional().nullable(),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  zip: z.string().trim().min(3).max(20),
  event_name: z.string().trim().max(200).optional().nullable(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const PUBLIC_APP_COLS = "id, org_kind, organization_type, organization_name, contact_name, contact_title, contact_email, contact_phone, address, city, state, zip, ein, event_name, event_date, status, current_step, ein_status, ein_result, agreement_bypassed, docs_status, rejection_reason, created_organization_id, created_nonprofit_id, applicant_user_id, submitted_at";
const EDITABLE = new Set(["draft", "applied", "verifying"]);
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

Deno.serve(async (req) => {
  const cors = onboardingCors(req);
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = serviceClient();

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    async function duplicateCheck(b: z.infer<typeof Basics>, ignoreId?: string) {
      if (b.org_kind === "nonprofit") return null; // nonprofits are de-duplicated on EIN in the next step
      const { data: orgs } = await db.from("organizations").select("name,address").ilike("name", b.organization_name.trim());
      if ((orgs ?? []).some((o) => norm(o.address) === norm(b.address))) return "An account already exists for this business at this address — contact support at hello@hariet.ai.";
      const { data: apps } = await db.from("partner_applications").select("id,address").ilike("organization_name", b.organization_name.trim()).neq("status", "rejected");
      if ((apps ?? []).some((a) => a.id !== ignoreId && norm(a.address) === norm(b.address))) return "An application already exists for this business at this address — contact support at hello@hariet.ai.";
      return null;
    }

    if (action === "start") {
      const p = Basics.safeParse(body.basics);
      if (!p.success) return json({ error: "Please complete every required field.", fields: p.error.flatten().fieldErrors }, 400);
      if (p.data.org_kind === "one_time_event" && (!p.data.event_name || !p.data.event_date)) return json({ error: "Event name and date are required." }, 400);
      const since = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await db.from("partner_applications").select("id", { count: "exact", head: true }).ilike("contact_email", p.data.contact_email).gte("created_at", since);
      if ((count ?? 0) >= 5) return json({ error: "Too many applications from this email. Please try again later." }, 429);
      const dup = await duplicateCheck(p.data);
      if (dup) return json({ error: dup, duplicate: true }, 409);
      const { data: app, error } = await db.from("partner_applications").insert({
        ...p.data, status: "applied", current_step: 2, ein_status: p.data.org_kind === "nonprofit" ? "pending" : "not_applicable",
      }).select("id, resume_token, organization_name, contact_name, contact_email").single();
      if (error) throw error;
      await sendEmail(app.contact_email, "Your Hariet.AI application has been started", [
        `Hi ${app.contact_name}, we saved your application for ${app.organization_name}.`,
        "You can return and finish at any time with your private resume link below. Keep it safe — anyone with the link can edit your application.",
      ], { label: "Resume my application", url: resumeUrl(app.resume_token) });
      await alertAdmins(db, "new_signup", "New partner application started", `${app.organization_name} (${p.data.org_kind.replace(/_/g, " ")}) began self-serve signup.`);
      return json({ ok: true, token: app.resume_token, application_id: app.id });
    }

    // ---- Everything below needs an existing application ----
    let app: any = null;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (token) {
      if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "Invalid resume link." }, 400);
      const { data } = await db.from("partner_applications").select("*").eq("resume_token", token).maybeSingle();
      app = data;
    } else {
      const user = await callerUser(req);
      if (user) {
        const { data } = await db.from("partner_applications").select("*").eq("applicant_user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        app = data;
      }
    }
    if (!app) return json({ error: "Application not found. Use the resume link from your email." }, 404);
    const reload = async () => (await db.from("partner_applications").select("*").eq("id", app.id).single()).data;

    if (action === "load") {
      const [template, sig, docs, slots] = await Promise.all([
        currentTemplate(db, app),
        db.from("agreement_signatures").select("id, template_version, agreement_title, signer_name, signer_title, signed_at, body_sha256").eq("application_id", app.id).order("signed_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("partner_documents").select("id, doc_type, file_name, expires_on, status, review_notes, created_at").eq("application_id", app.id).neq("status", "superseded").order("created_at", { ascending: false }),
        docSlots(db, app.org_kind),
      ]);
      const pub: Record<string, unknown> = {};
      for (const k of PUBLIC_APP_COLS.split(", ")) pub[k] = app[k];
      return json({ application: pub, template: template ? { id: template.id, version: template.version, title: template.title, body: template.body } : null, signature: sig.data, documents: docs.data ?? [], slots });
    }

    if (action === "save") {
      if (!EDITABLE.has(app.status)) return json({ error: "This application has been submitted and can no longer be edited." }, 409);
      const p = Basics.safeParse({ ...body.basics, org_kind: app.org_kind });
      if (!p.success) return json({ error: "Please complete every required field.", fields: p.error.flatten().fieldErrors }, 400);
      const dup = await duplicateCheck(p.data, app.id);
      if (dup) return json({ error: dup, duplicate: true }, 409);
      await db.from("partner_applications").update({ ...p.data, current_step: Math.max(app.current_step, 2) }).eq("id", app.id);
      return json({ ok: true });
    }

    if (action === "verify_ein") {
      if (app.org_kind !== "nonprofit") return json({ error: "EIN verification is for nonprofits only." }, 400);
      if (!EDITABLE.has(app.status)) return json({ error: "Application already submitted." }, 409);
      const ein = String(body.ein ?? "").replace(/\D/g, "");
      if (ein.length !== 9) return json({ error: "Enter your 9-digit EIN (for example 12-3456789)." }, 400);
      const { data: dupNp } = await db.from("nonprofits").select("id").eq("ein", ein).limit(1);
      const { data: dupApp } = await db.from("partner_applications").select("id").eq("ein", ein).neq("id", app.id).neq("status", "rejected").limit(1);
      if (dupNp?.length || dupApp?.length) return json({ error: "An account already exists for this EIN — contact support at hello@hariet.ai.", duplicate: true }, 409);
      await db.from("partner_applications").update({ status: "verifying", ein }).eq("id", app.id);
      const r = await checkEin(ein);
      await db.from("partner_applications").update({
        ein_status: r.status, ein_result: { reason: r.reason, ...(r.raw as object ?? {}) }, current_step: 3, status: "applied",
      }).eq("id", app.id);
      if (r.status === "needs_help") {
        await alertAdmins(db, "system", "EIN verification needs admin help", `${app.organization_name} (EIN ${ein}): ${r.reason}`);
      }
      return json({ ok: true, ein_status: r.status, reason: r.reason, irs_name: r.name ?? null });
    }

    if (action === "sign") {
      const S = z.object({
        template_id: z.string().uuid(), signer_name: z.string().trim().min(3).max(120), signer_title: z.string().trim().min(2).max(120),
        authorized: z.literal(true), consent_electronic: z.literal(true),
      });
      const p = S.safeParse(body);
      if (!p.success) return json({ error: "Type your full name and title, and confirm both checkboxes." }, 400);
      const { data: existing } = await db.from("agreement_signatures").select("id").eq("application_id", app.id).limit(1);
      if (existing?.length) return json({ error: "This agreement has already been signed." }, 409);
      const tpl = await currentTemplate(db, app);
      if (!tpl || tpl.id !== p.data.template_id) return json({ error: "The agreement was updated. Please review the latest version and sign again." }, 409);
      const user = await callerUser(req);
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || null;
      const signedAt = new Date().toISOString();
      const record = `${tpl.title}\nVersion ${tpl.version}\n\n${tpl.body}`;
      const hash = await sha256Hex(`${record}\n---\n${p.data.signer_name}|${p.data.signer_title}|${app.contact_email}|${signedAt}|${ip ?? ""}`);
      const { error } = await db.from("agreement_signatures").insert({
        application_id: app.id, organization_id: app.created_organization_id, nonprofit_id: app.created_nonprofit_id,
        template_id: tpl.id, template_version: tpl.version, agreement_title: tpl.title, signed_body: record, body_sha256: hash,
        signer_name: p.data.signer_name, signer_title: p.data.signer_title, signer_email: app.contact_email,
        authorized_attestation: true, consent_to_electronic: true, ip_address: ip, user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
        signed_by_user_id: user?.id ?? null, signed_at: signedAt,
      });
      if (error) throw error;
      await db.from("partner_applications").update({ current_step: Math.max(app.current_step, 4), contact_title: app.contact_title ?? p.data.signer_title }).eq("id", app.id);
      await sendEmail(app.contact_email, "Your signed Hariet.AI agreement", [
        `${p.data.signer_name} (${p.data.signer_title}) signed "${tpl.title}" version ${tpl.version} on behalf of ${app.organization_name} at ${signedAt} UTC.`,
        `Document fingerprint (SHA-256): ${hash}`, "Keep this email for your records.",
      ]);
      return json({ ok: true, body_sha256: hash, signed_at: signedAt });
    }

    if (action === "doc_upload_url") {
      if (["active", "suspended"].includes(app.status) && !body.renewal) return json({ error: "Documents are locked." }, 409);
      const name = String(body.file_name ?? "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      if (!/\.(pdf|png|jpe?g|webp|heic)$/i.test(name)) return json({ error: "Upload a PDF or image file." }, 400);
      const path = `${app.id}/${crypto.randomUUID()}-${name}`;
      const { data, error } = await db.storage.from("partner-documents").createSignedUploadUrl(path);
      if (error) throw error;
      return json({ ok: true, path, token: data.token });
    }

    if (action === "doc_register") {
      const D = z.object({ doc_type: z.string().regex(/^[a-z0-9_]{2,40}$/), path: z.string().max(300), file_name: z.string().max(200), expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable() });
      const p = D.safeParse(body);
      if (!p.success || !p.data.path.startsWith(`${app.id}/`)) return json({ error: "Invalid document." }, 400);
      const slots = await docSlots(db, app.org_kind);
      const slot = slots.find((s) => s.key === p.data.doc_type);
      if (!slot) return json({ error: "Unknown document type." }, 400);
      if (slot.needs_expiry) {
        if (!p.data.expires_on) return json({ error: "Enter the expiration date shown on the certificate." }, 400);
        if (new Date(p.data.expires_on) <= new Date()) return json({ error: "This certificate has already expired. Please upload a current one." }, 400);
      }
      // Confirm the file really landed in storage.
      const folder = p.data.path.split("/")[0];
      const { data: files } = await db.storage.from("partner-documents").list(folder, { search: p.data.path.split("/")[1] });
      if (!files?.length) return json({ error: "Upload not found. Please try again." }, 400);
      await db.from("partner_documents").update({ status: "superseded" }).eq("application_id", app.id).eq("doc_type", p.data.doc_type).in("status", ["submitted", "rejected"]);
      await db.from("partner_documents").insert({
        application_id: app.id, organization_id: app.created_organization_id, nonprofit_id: app.created_nonprofit_id,
        doc_type: p.data.doc_type, file_path: p.data.path, file_name: p.data.file_name, expires_on: p.data.expires_on ?? null,
      });
      await refreshDocsStatus(db, app);
      if (app.status === "rejected") {
        await db.from("partner_applications").update({ status: "pending_review", rejection_reason: null }).eq("id", app.id);
        await alertAdmins(db, "new_signup", "Applicant re-uploaded documents", `${app.organization_name} uploaded a new ${slot.label.toLowerCase()} after rejection.`);
      } else if (["active", "suspended"].includes(app.status)) {
        await alertAdmins(db, "system", "Renewed document uploaded", `${app.organization_name} uploaded a new ${slot.label.toLowerCase()} for review.`);
      }
      return json({ ok: true });
    }

    if (action === "submit") {
      if (!EDITABLE.has(app.status)) return json({ error: "Already submitted." }, 409);
      if (app.org_kind === "nonprofit" && app.ein_status === "pending") return json({ error: "Please verify your EIN first." }, 400);
      const { data: sig } = await db.from("agreement_signatures").select("id").eq("application_id", app.id).limit(1);
      if (!sig?.length && !app.agreement_bypassed) return json({ error: "Please sign the agreement first." }, 400);
      const docsStatus = await refreshDocsStatus(db, app);
      if (docsStatus === "missing") return json({ error: "Please upload your certificate of insurance and any other required documents." }, 400);
      await provisionAccount(db, app);
      await db.from("partner_applications").update({ status: "pending_review", submitted_at: new Date().toISOString(), current_step: 5 }).eq("id", app.id);
      const fresh = await reload();
      await sendEmail(fresh.contact_email, "We received your Hariet.AI application", [
        `Hi ${fresh.contact_name}, thank you — your application for ${fresh.organization_name} is now pending review.`,
        "We'll email you as soon as it's approved, or if we need anything else. You can't post or claim donations until approval.",
        "We also sent a separate email with a secure link to set your password.",
      ], { label: "View application status", url: resumeUrl(fresh.resume_token) });
      await alertAdmins(db, "new_signup", "New partner application ready for review", `${fresh.organization_name} submitted their application${fresh.ein_status === "needs_help" ? " (EIN needs admin help)" : ""}.`);
      return json({ ok: true, status: "pending_review" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-onboarding", e);
    return json({ error: (e as Error).message || "Something went wrong" }, 500);
  }
});
