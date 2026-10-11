// Admin-only onboarding actions: assisted signup, document review, EIN override,
// approve / reject, access toggle, resend links, document-slot configuration.
import { z } from "npm:zod@3.23.8";
import {
  onboardingCors, serviceClient, callerUser, sendEmail, checkEin, resumeUrl, refreshDocsStatus, provisionAccount, APP_URL,
} from "../_shared/onboarding.ts";

Deno.serve(async (req) => {
  const cors = onboardingCors(req);
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = serviceClient();
  try {
    const user = await callerUser(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const getApp = async (id: unknown) => {
      if (typeof id !== "string") return null;
      return (await db.from("partner_applications").select("*").eq("id", id).maybeSingle()).data;
    };

    if (action === "assisted_create") {
      const B = z.object({
        org_kind: z.enum(["venue", "nonprofit", "one_time_event"]), organization_type: z.string().max(60).optional().nullable(),
        organization_name: z.string().trim().min(2).max(200), contact_name: z.string().trim().min(2).max(120),
        contact_title: z.string().trim().max(120).optional().nullable(), contact_email: z.string().trim().email(),
        contact_phone: z.string().trim().min(7).max(30), address: z.string().trim().min(3), city: z.string().trim().min(2),
        state: z.string().trim().min(2), zip: z.string().trim().min(3), ein: z.string().optional().nullable(),
        event_name: z.string().optional().nullable(), event_date: z.string().optional().nullable(),
        bypass_agreement: z.boolean(),
      });
      const p = B.safeParse(body.basics);
      if (!p.success) return json({ error: "Complete every required field.", fields: p.error.flatten().fieldErrors }, 400);
      const { bypass_agreement, ein, ...basics } = p.data;
      const einDigits = (ein ?? "").replace(/\D/g, "");
      if (basics.org_kind === "nonprofit") {
        if (einDigits.length !== 9) return json({ error: "Nonprofits need a 9-digit EIN." }, 400);
        const { data: dup } = await db.from("nonprofits").select("id").eq("ein", einDigits).limit(1);
        if (dup?.length) return json({ error: "An account already exists for this EIN." }, 409);
      } else {
        const { data: orgs } = await db.from("organizations").select("address").ilike("name", basics.organization_name);
        const n = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        if ((orgs ?? []).some((o) => n(o.address) === n(basics.address))) return json({ error: "An account already exists for this business at this address." }, 409);
      }
      let einFields: Record<string, unknown> = { ein_status: "not_applicable" };
      if (basics.org_kind === "nonprofit") {
        const r = await checkEin(einDigits);
        einFields = { ein: einDigits, ein_status: r.status, ein_result: { reason: r.reason, ...(r.raw as object ?? {}) } };
      }
      const { data: app, error } = await db.from("partner_applications").insert({
        ...basics, ...einFields, status: "applied", current_step: 4, agreement_bypassed: bypass_agreement, assisted_by: user.id,
      }).select("*").single();
      if (error) throw error;
      await provisionAccount(db, app);
      await db.from("partner_applications").update({ status: "pending_review", submitted_at: new Date().toISOString() }).eq("id", app.id);
      await sendEmail(app.contact_email, "Your Hariet.AI application is underway", [
        `Hi ${app.contact_name}, our team started your Hariet.AI application for ${app.organization_name}.`,
        "Next steps: set your password with the secure link we just sent, then sign in to sign your partner agreement and upload your certificate of insurance. Nothing activates until both are done and reviewed.",
      ], { label: "Open my application", url: resumeUrl(app.resume_token) });
      return json({ ok: true, application_id: app.id });
    }

    if (action === "review_doc") {
      const p = z.object({ document_id: z.string().uuid(), decision: z.enum(["approved", "rejected"]), notes: z.string().max(1000).optional().nullable() }).safeParse(body);
      if (!p.success) return json({ error: "Invalid input" }, 400);
      if (p.data.decision === "rejected" && !p.data.notes?.trim()) return json({ error: "Give a reason so the applicant knows what to fix." }, 400);
      const { data: doc } = await db.from("partner_documents").update({ status: p.data.decision, review_notes: p.data.notes ?? null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", p.data.document_id).select("*").single();
      if (!doc) return json({ error: "Not found" }, 404);
      // Older approved copies of the same document are replaced by the new approval.
      if (p.data.decision === "approved" && doc.application_id) {
        await db.from("partner_documents").update({ status: "superseded" }).eq("application_id", doc.application_id).eq("doc_type", doc.doc_type).eq("status", "approved").neq("id", doc.id);
      }
      const app = await getApp(doc.application_id);
      if (app) {
        await refreshDocsStatus(db, app);
        if (p.data.decision === "rejected") {
          await sendEmail(app.contact_email, "Hariet.AI needs an updated document", [
            `Hi ${app.contact_name}, we couldn't accept the ${doc.doc_type.replace(/_/g, " ")} you uploaded for ${app.organization_name}.`,
            `Reason: ${p.data.notes}`, "Please upload a corrected copy using the link below.",
          ], { label: "Re-upload document", url: resumeUrl(app.resume_token) });
        }
        // Renewed insurance lifts an insurance pause.
        if (p.data.decision === "approved" && doc.doc_type === "insurance" && doc.expires_on && new Date(doc.expires_on) > new Date()) {
          const table = app.created_nonprofit_id ? "nonprofits" : "organizations";
          const id = app.created_nonprofit_id ?? app.created_organization_id;
          if (id) await db.from(table).update({ posting_paused: false, paused_reason: null }).eq("id", id).eq("paused_reason", "insurance_expired");
        }
      }
      return json({ ok: true });
    }

    if (action === "set_ein") {
      const p = z.object({ application_id: z.string().uuid(), ein_status: z.enum(["verified", "needs_help"]), note: z.string().max(500).optional() }).safeParse(body);
      if (!p.success) return json({ error: "Invalid input" }, 400);
      const app = await getApp(p.data.application_id);
      if (!app) return json({ error: "Not found" }, 404);
      await db.from("partner_applications").update({ ein_status: p.data.ein_status, ein_result: { ...(app.ein_result ?? {}), admin_override: { by: user.id, at: new Date().toISOString(), note: p.data.note ?? null } } }).eq("id", app.id);
      return json({ ok: true });
    }

    if (action === "approve") {
      const app = await getApp(body.application_id);
      if (!app) return json({ error: "Not found" }, 404);
      const { data: sig } = await db.from("agreement_signatures").select("id").eq("application_id", app.id).limit(1);
      const docs = await refreshDocsStatus(db, app);
      const problems: string[] = [];
      if (!sig?.length) problems.push("the agreement is not signed yet");
      if (docs !== "approved") problems.push("documents are not all approved");
      if (app.org_kind === "nonprofit" && app.ein_status !== "verified") problems.push("the EIN is not verified");
      if (!app.created_organization_id && !app.created_nonprofit_id) problems.push("the account has not been created");
      if (problems.length) return json({ error: `Can't approve yet: ${problems.join("; ")}.` }, 400);
      if (app.created_nonprofit_id) {
        await db.from("nonprofits").update({ approval_status: "approved", is_verified: true, is_active: true }).eq("id", app.created_nonprofit_id);
        await db.from("nonprofit_locations").update({ approval_status: "approved" }).eq("nonprofit_id", app.created_nonprofit_id);
      } else {
        await db.from("organizations").update({ approval_status: "approved", is_active: true }).eq("id", app.created_organization_id);
        await db.from("locations").update({ approval_status: "approved" }).eq("organization_id", app.created_organization_id);
      }
      await db.from("partner_applications").update({ status: "active", reviewed_at: new Date().toISOString(), reviewed_by: user.id, rejection_reason: null }).eq("id", app.id);
      await sendEmail(app.contact_email, "You're approved on Hariet.AI", [
        `Hi ${app.contact_name}, ${app.organization_name} is now active on Hariet.AI.`,
        app.org_kind === "nonprofit" ? "You can now browse and claim donations near you." : "You can now post donations from your dashboard.",
      ], { label: "Sign in", url: `${APP_URL}/login` });
      return json({ ok: true });
    }

    if (action === "reject") {
      const p = z.object({ application_id: z.string().uuid(), reason: z.string().trim().min(3).max(1000) }).safeParse(body);
      if (!p.success) return json({ error: "A reason is required." }, 400);
      const app = await getApp(p.data.application_id);
      if (!app) return json({ error: "Not found" }, 404);
      await db.from("partner_applications").update({ status: "rejected", rejection_reason: p.data.reason, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", app.id);
      await sendEmail(app.contact_email, "Update on your Hariet.AI application", [
        `Hi ${app.contact_name}, we couldn't approve the application for ${app.organization_name} yet.`,
        `Reason: ${p.data.reason}`, "You can upload corrected documents with the link below and we'll review again.",
      ], { label: "Update my application", url: resumeUrl(app.resume_token) });
      return json({ ok: true });
    }

    if (action === "set_access") {
      const p = z.object({ kind: z.enum(["organization", "nonprofit"]), id: z.string().uuid(), active: z.boolean(), reason: z.string().max(500).optional() }).safeParse(body);
      if (!p.success) return json({ error: "Invalid input" }, 400);
      const table = p.data.kind === "nonprofit" ? "nonprofits" : "organizations";
      const col = p.data.kind === "nonprofit" ? "nonprofit_id" : "organization_id";
      await db.from(table).update({ is_active: p.data.active }).eq("id", p.data.id);
      const { data: members } = await db.from("profiles").select("id").eq(col, p.data.id);
      for (const m of members ?? []) {
        if (m.id === user.id) continue;
        await db.auth.admin.updateUserById(m.id, { ban_duration: p.data.active ? "none" : "876000h" });
      }
      const appCol = p.data.kind === "nonprofit" ? "created_nonprofit_id" : "created_organization_id";
      const { data: app } = await db.from("partner_applications").select("*").eq(appCol, p.data.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (app) {
        const next = p.data.active ? (app.status === "suspended" ? "active" : app.status) : "suspended";
        await db.from("partner_applications").update({ status: next }).eq("id", app.id);
        if (!p.data.active) {
          await sendEmail(app.contact_email, "Your Hariet.AI account has been suspended", [
            `Hi ${app.contact_name}, access for ${app.organization_name} has been paused.`,
            p.data.reason ? `Reason: ${p.data.reason}` : "Please contact hello@hariet.ai for details.",
          ]);
        } else {
          await sendEmail(app.contact_email, "Your Hariet.AI access is restored", [`Hi ${app.contact_name}, ${app.organization_name} can sign in again.`], { label: "Sign in", url: `${APP_URL}/login` });
        }
      }
      return json({ ok: true, members: members?.length ?? 0 });
    }

    if (action === "clear_pause") {
      const p = z.object({ kind: z.enum(["organization", "nonprofit"]), id: z.string().uuid() }).safeParse(body);
      if (!p.success) return json({ error: "Invalid input" }, 400);
      const patch: Record<string, unknown> = { posting_paused: false, paused_reason: null };
      if (p.data.kind === "nonprofit" && body.mark_verified === true) patch.is_verified = true;
      await db.from(p.data.kind === "nonprofit" ? "nonprofits" : "organizations").update(patch).eq("id", p.data.id);
      return json({ ok: true });
    }

    if (action === "resend_link") {
      const app = await getApp(body.application_id);
      if (!app) return json({ error: "Not found" }, 404);
      await sendEmail(app.contact_email, "Your Hariet.AI application link", [`Hi ${app.contact_name}, here is your private link to continue the application for ${app.organization_name}.`], { label: "Open my application", url: resumeUrl(app.resume_token) });
      if (app.applicant_user_id) {
        const { data: link } = await db.auth.admin.generateLink({ type: "recovery", email: app.contact_email, options: { redirectTo: `${APP_URL}/reset-password` } });
        if (link?.properties?.action_link) await sendEmail(app.contact_email, "Set your Hariet.AI password", ["Use this secure one-time link to set your password."], { label: "Set my password", url: link.properties.action_link });
      }
      return json({ ok: true });
    }

    if (action === "set_doc_slots") {
      const Slot = z.object({ key: z.string().regex(/^[a-z0-9_]{2,40}$/), label: z.string().min(2).max(80), required: z.boolean(), needs_expiry: z.boolean(), org_kinds: z.array(z.enum(["venue", "nonprofit", "one_time_event"])).min(1) });
      const p = z.array(Slot).max(10).safeParse(body.slots);
      if (!p.success) return json({ error: "Invalid document slots" }, 400);
      await db.from("app_config").upsert({ key: "partner_document_slots", value: JSON.stringify(p.data.filter((s) => s.key !== "insurance")), updated_at: new Date().toISOString() });
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-onboarding-admin", e);
    return json({ error: (e as Error).message || "Something went wrong" }, 500);
  }
});
