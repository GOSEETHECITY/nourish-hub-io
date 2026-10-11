// Scheduled compliance jobs (CRON_SECRET required):
//  job=insurance — daily: reminders from 30 days before expiry; pause activity once coverage lapses.
//  job=ein       — weekly: re-check active nonprofits' 501(c)(3) status; flag + pause on any change.
import { requireCronSecret, internalCors, alertFatalError } from "../_shared/ops.ts";
import { serviceClient, sendEmail, alertAdmins, checkEin, resumeUrl } from "../_shared/onboarding.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: internalCors });
  const denied = requireCronSecret(req);
  if (denied) return denied;
  const db = serviceClient();
  const out = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  try {
    const { job } = await req.json().catch(() => ({}));

    if (job === "insurance") {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const in30 = new Date(today.getTime() + 30 * 86400_000).toISOString().slice(0, 10);
      const { data: docs } = await db.from("partner_documents").select("*").eq("doc_type", "insurance").eq("status", "approved").lte("expires_on", in30);
      let reminded = 0, paused = 0;
      const expiringNames: string[] = [];
      for (const d of docs ?? []) {
        const { data: app } = await db.from("partner_applications").select("*").eq("id", d.application_id).maybeSingle();
        if (!app) continue;
        const table = app.created_nonprofit_id ? "nonprofits" : "organizations";
        const id = app.created_nonprofit_id ?? app.created_organization_id;
        // A newer approved/pending certificate covers this entity — skip.
        const { data: newer } = await db.from("partner_documents").select("id").eq("application_id", app.id).eq("doc_type", "insurance").in("status", ["approved", "submitted"]).gt("expires_on", d.expires_on).limit(1);
        if (newer?.length) continue;
        const expired = new Date(d.expires_on) < today;
        if (expired && id) {
          const { data: ent } = await db.from(table).select("posting_paused").eq("id", id).maybeSingle();
          if (ent && !ent.posting_paused) {
            await db.from(table).update({ posting_paused: true, paused_reason: "insurance_expired" }).eq("id", id);
            paused++;
            await sendEmail(app.contact_email, "Hariet.AI activity paused — insurance expired", [
              `Hi ${app.contact_name}, the certificate of insurance for ${app.organization_name} expired on ${d.expires_on}.`,
              "Posting and claiming are paused until a current certificate is uploaded and approved.",
            ], { label: "Upload new certificate", url: resumeUrl(app.resume_token) });
            await alertAdmins(db, "system", "Insurance lapsed — activity paused", `${app.organization_name}'s insurance expired ${d.expires_on}.`);
          }
          continue;
        }
        const last = d.last_reminder_at ? new Date(d.last_reminder_at).getTime() : 0;
        if (Date.now() - last < 7 * 86400_000) continue;
        await sendEmail(app.contact_email, "Your Hariet.AI insurance certificate expires soon", [
          `Hi ${app.contact_name}, the certificate of insurance for ${app.organization_name} expires on ${d.expires_on}.`,
          "Please upload your renewed certificate so your account stays active.",
        ], { label: "Upload renewed certificate", url: resumeUrl(app.resume_token) });
        await db.from("partner_documents").update({ last_reminder_at: new Date().toISOString() }).eq("id", d.id);
        expiringNames.push(`${app.organization_name} (${d.expires_on})`);
        reminded++;
      }
      if (expiringNames.length) await alertAdmins(db, "system", "Insurance expiring within 30 days", expiringNames.join(", "), "/admin/onboarding?tab=insurance");
      return out({ ok: true, reminded, paused });
    }

    if (job === "ein") {
      const { data: nps } = await db.from("nonprofits").select("id, organization_name, ein, is_verified, ein_check_result").eq("approval_status", "approved").eq("is_active", true).not("ein", "is", null);
      let checked = 0, flagged = 0;
      for (const np of nps ?? []) {
        const r = await checkEin(np.ein!);
        if (r.transient) continue; // service hiccup — never flag on network errors
        checked++;
        const prevOk = (np.ein_check_result as any)?.status !== "needs_help";
        await db.from("nonprofits").update({ ein_last_checked_at: new Date().toISOString(), ein_check_result: { status: r.status, reason: r.reason, ...(r.raw as object ?? {}) } }).eq("id", np.id);
        if (r.status !== "verified" && prevOk) {
          flagged++;
          await db.from("nonprofits").update({ posting_paused: true, paused_reason: "ein_status_change", is_verified: false }).eq("id", np.id);
          await alertAdmins(db, "system", "Nonprofit exempt status changed", `${np.organization_name} (EIN ${np.ein}): ${r.reason} Donation activity paused until reviewed.`);
        }
        await new Promise((res) => setTimeout(res, 250)); // be polite to ProPublica
      }
      return out({ ok: true, checked, flagged });
    }

    return out({ error: "Unknown job" }, 400);
  } catch (e) {
    await alertFatalError("partner-compliance", e);
    return out({ error: (e as Error).message }, 500);
  }
});
