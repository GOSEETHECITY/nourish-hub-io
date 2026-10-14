// Completes venue / nonprofit / government / one-time-event partner signup
// with the service role.
//
// Client-side signup cannot do this work: RLS forbids a role-less user from
// creating an organization, and the `profiles` UPDATE policy blocks changing
// organization_id / nonprofit_id. All linking writes happen here behind a
// verified JWT. The account itself is created client-side first (supabase
// auth.signUp), so a signed-out visitor can complete the whole flow.
//
// Creates: the account link, the org (or nonprofit) row, the profile link,
// the role, the e-signature record (agreement_signatures is immutable, so it
// is written here, never from the client), the EIN result (nonprofit), and
// the uploaded partner documents. Address, locations, pickup details and the
// sustainability baseline are collected later, after approval.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { alertFatalError } from "../_shared/ops.ts";
import { currentTemplate, sha256Hex } from "../_shared/onboarding.ts";

const ALLOWED_ORIGINS = [
  "https://hariet.ai",
  "https://www.hariet.ai",
  "https://goseethecity.com",
  "https://www.goseethecity.com",
];

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const AccountSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).optional().nullable(),
});

// E-signature collected during signup. Written server-side only:
// agreement_signatures is immutable and has no client write grants.
const SignatureSchema = z.object({
  template_id: z.string().uuid(),
  signer_name: z.string().trim().min(3).max(120),
  signer_title: z.string().trim().min(2).max(120),
});

// EIN verification result from the signup EIN step (nonprofit only).
const EinSchema = z.object({
  ein: z.string().regex(/^\d{9}$/),
  ein_status: z.enum(["verified", "needs_help"]),
  irs_name: z.string().max(255).optional().nullable(),
});

// Documents uploaded to storage during submit, registered here.
const DocumentSchema = z.object({
  doc_type: z.string().regex(/^[a-z0-9_]{2,40}$/),
  path: z.string().max(300),
  file_name: z.string().max(200),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const VenueSchema = z.object({
  pathway: z.literal("venue"),
  account: AccountSchema,
  org: z.object({
    name: z.string().trim().min(1).max(255),
    type: z.string().trim().min(1).max(64),
  }),
  signature: SignatureSchema,
  documents: z.array(DocumentSchema).min(1),
});

const NonprofitSchema = z.object({
  pathway: z.literal("nonprofit"),
  account: AccountSchema,
  org: z.object({
    name: z.string().trim().min(1).max(255),
  }),
  ein: EinSchema,
  signature: SignatureSchema,
  documents: z.array(DocumentSchema).min(1),
});

const GovernmentSchema = z.object({
  pathway: z.literal("government"),
  account: AccountSchema,
  invitationCode: z.string().trim().min(1).max(64),
  org: z.object({
    name: z.string().trim().min(1).max(255),
    type: z.enum(["municipal_government", "county_government", "state_government"]),
  }),
  signature: SignatureSchema,
  documents: z.array(DocumentSchema).optional().default([]),
});

// Lightweight single-event donor (weddings, one-night events, grand openings).
const OneTimeEventSchema = z.object({
  pathway: z.literal("one_time_event"),
  account: AccountSchema,
  event: z.object({
    name: z.string().trim().min(1).max(255),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    address: z.string().trim().min(1).max(255),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(2).max(50),
    zip: z.string().trim().min(3).max(20),
  }),
  signature: SignatureSchema,
  documents: z.array(DocumentSchema).min(1),
});

const BodySchema = z.discriminatedUnion("pathway", [VenueSchema, NonprofitSchema, GovernmentSchema, OneTimeEventSchema]);

const VENUE_ORG_TYPES = new Set([
  "restaurant", "catering_company", "event", "hotel", "convention_center",
  "stadium", "arena", "farm", "grocery_store", "food_truck", "airport",
  "festival", "resort", "cafe", "food_manufacturer", "food_distributor",
  "food_beverage_group", "hospitality_group", "venue_events_group",
  "farm_grocery_group", "franchise",
]);

function joinCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return `${prefix}-${out}`;
}

const nn = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : (s as string | null);
};

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Rows created in this call, so a failure can unwind cleanly and the
  // applicant can retry with the same email.
  const undo: Array<{ table: string; id: string }> = [];
  let linkedUserId: string | null = null;
  const rollback = async () => {
    if (linkedUserId) {
      await admin.from("user_roles").delete().eq("user_id", linkedUserId);
      await admin.from("profiles").update({
        organization_id: null, nonprofit_id: null, location_id: null, nonprofit_location_id: null,
      }).eq("id", linkedUserId);
    }
    for (const row of [...undo].reverse()) {
      await admin.from(row.table).delete().eq("id", row.id);
    }
  };

  const fail = (message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), { status, headers });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("You must be signed in to complete signup.", 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return fail("Invalid authentication", 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Please check the form and try again.", details: parsed.error.flatten() }),
        { status: 400, headers },
      );
    }
    const body = parsed.data;
    const account = body.account;

    // A user may only complete partner signup once.
    const { data: existingRoles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (existingRoles && existingRoles.length > 0) {
      return fail("An account with this email already exists.", 409);
    }
    const { data: existingProfile } = await admin
      .from("profiles").select("organization_id, nonprofit_id").eq("id", user.id).maybeSingle();
    if (existingProfile?.organization_id || existingProfile?.nonprofit_id) {
      return fail("An account with this email already exists.", 409);
    }

    let organizationId: string | null = null;
    let nonprofitId: string | null = null;
    let submissionType: string;
    let contactName = `${account.firstName} ${account.lastName}`.trim();
    const contactEmail = user.email ?? "";

    if (body.pathway === "government") {
      // The role is issued by the existing invitation-gated function, called
      // with the applicant's own JWT exactly as before.
      const roleRes = await fetch(`${supabaseUrl}/functions/v1/assign-government-role`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ invitationCode: body.invitationCode }),
      });
      const roleBody = await roleRes.json().catch(() => ({}));
      if (!roleRes.ok || roleBody?.error) {
        return fail(roleBody?.error || "Invalid or expired invitation code.", 403);
      }
      linkedUserId = user.id;
    }

    if (body.pathway === "one_time_event") {
      const ev = body.event;
      if (ev.date < new Date().toISOString().slice(0, 10)) return fail("The event date must be today or later.", 400);
      submissionType = "event";
      const { data: orgRow, error: orgError } = await admin.from("organizations").insert({
        name: ev.name, type: "event", primary_contact_name: contactName, primary_contact_email: contactEmail,
        primary_contact_phone: nn(account.phone), address: ev.address, city: ev.city, state: ev.state, zip: ev.zip,
        approval_status: "pending", join_code: joinCode("HAR"),
        is_one_time_event: true, event_name: ev.name, event_date: ev.date,
      }).select("id").single();
      if (orgError) throw orgError;
      organizationId = orgRow.id;
      undo.push({ table: "organizations", id: orgRow.id });

      const { data: locRow, error: locError } = await admin.from("locations").insert({
        organization_id: organizationId, name: ev.name, address: ev.address, city: ev.city, state: ev.state, zip: ev.zip,
        pickup_address: [ev.address, ev.city, ev.state, ev.zip].join(", "), location_type: "event",
        approval_status: "pending", contact_name: contactName, contact_email: contactEmail, contact_phone: nn(account.phone),
      }).select("id").single();
      if (locError) throw locError;
      undo.push({ table: "locations", id: locRow.id });

      const { error: profileError } = await admin.from("profiles").update({
        first_name: account.firstName, last_name: account.lastName, email: contactEmail,
        phone: nn(account.phone), organization_id: organizationId, location_id: locRow.id,
      }).eq("id", user.id);
      if (profileError) throw profileError;
      linkedUserId = user.id;
      const { error: roleError } = await admin.from("user_roles").insert({ user_id: user.id, role: "venue_partner" });
      if (roleError) throw roleError;
    } else if (body.pathway === "venue" || body.pathway === "government") {
      const isGov = body.pathway === "government";
      const type = isGov ? body.org.type : body.org.type;
      if (!isGov && !VENUE_ORG_TYPES.has(type)) return fail("Please choose a valid organization type.", 400);
      submissionType = type;

      const { data: orgRow, error: orgError } = await admin
        .from("organizations")
        .insert({
          name: body.org.name,
          type,
          primary_contact_name: contactName,
          primary_contact_email: contactEmail,
          primary_contact_phone: nn(account.phone),
          approval_status: "pending",
          join_code: joinCode(isGov ? "GOV" : "HAR"),
        })
        .select("id")
        .single();
      if (orgError) throw orgError;
      organizationId = orgRow.id;
      undo.push({ table: "organizations", id: orgRow.id });

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          first_name: account.firstName,
          last_name: account.lastName,
          email: contactEmail,
          phone: nn(account.phone),
          organization_id: organizationId,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;
      linkedUserId = user.id;

      if (!isGov) {
        const { error: roleError } = await admin
          .from("user_roles")
          .insert({ user_id: user.id, role: "venue_partner" });
        if (roleError) throw roleError;
      }
    } else {
      submissionType = "nonprofit_organization";

      const { data: npRow, error: npError } = await admin
        .from("nonprofits")
        .insert({
          user_id: user.id,
          organization_name: body.org.name,
          primary_contact: contactName,
          primary_contact_name: contactName,
          primary_contact_email: contactEmail,
          primary_contact_phone: nn(account.phone),
          approval_status: "pending",
          join_code: joinCode("NP"),
        })
        .select("id")
        .single();
      if (npError) throw npError;
      nonprofitId = npRow.id;
      undo.push({ table: "nonprofits", id: npRow.id });

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          first_name: account.firstName,
          last_name: account.lastName,
          email: contactEmail,
          phone: nn(account.phone),
          nonprofit_id: nonprofitId,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;
      linkedUserId = user.id;

      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: user.id, role: "nonprofit_partner" });
      if (roleError) throw roleError;
    }

    // E-signature: written server-side only (agreement_signatures is immutable,
    // no client write grants). The template is re-fetched to guard against
    // signing a stale version.
    {
      const templateKind =
        body.pathway === "nonprofit"
          ? "nonprofit"
          : body.pathway === "one_time_event"
            ? "one_time_event"
            : "venue";
      const tpl = await currentTemplate(admin, { org_kind: templateKind });
      if (!tpl || tpl.id !== body.signature.template_id) {
        throw new Error("The agreement was updated. Please review the latest version and sign again.");
      }
      const ip =
        (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;
      const signedAt = new Date().toISOString();
      const record = `${tpl.title}\nVersion ${tpl.version}\n\n${tpl.body}`;
      const hash = await sha256Hex(
        `${record}\n---\n${body.signature.signer_name}|${body.signature.signer_title}|${contactEmail}|${signedAt}|${ip ?? ""}`,
      );
      const { error: sigError } = await admin.from("agreement_signatures").insert({
        organization_id: organizationId,
        nonprofit_id: nonprofitId,
        template_id: tpl.id,
        template_version: tpl.version,
        agreement_title: tpl.title,
        signed_body: record,
        body_sha256: hash,
        signer_name: body.signature.signer_name,
        signer_title: body.signature.signer_title,
        signer_email: contactEmail,
        authorized_attestation: true,
        consent_to_electronic: true,
        ip_address: ip,
        user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
        signed_by_user_id: user.id,
        signed_at: signedAt,
      });
      if (sigError) throw sigError;
    }

    // EIN result for nonprofits (verified at the signup EIN step).
    if (body.pathway === "nonprofit" && nonprofitId) {
      const { error: einError } = await admin
        .from("nonprofits")
        .update({
          ein: body.ein.ein,
          ein_status: body.ein.ein_status,
          ein_check_result: {
            irs_name: body.ein.irs_name ?? null,
            checked_at: new Date().toISOString(),
          },
          ein_last_checked_at: new Date().toISOString(),
        })
        .eq("id", nonprofitId);
      if (einError) throw einError;
    }

    // Partner documents (insurance). Files were uploaded to storage during
    // submit; verify each one landed, then register it against the new org.
    // partner_documents rows cascade-delete with the org on rollback.
    for (const doc of body.documents ?? []) {
      if (!doc.path.startsWith(`${user.id}/`)) throw new Error("Invalid document upload.");
      const parts = doc.path.split("/");
      const { data: files } = await admin.storage
        .from("partner-documents")
        .list(parts[0], { search: parts.slice(1).join("/") });
      if (!files?.length) throw new Error("A document upload was not found. Please try again.");
      if (doc.doc_type === "insurance") {
        if (!doc.expires_on) throw new Error("Enter the expiration date shown on the certificate of insurance.");
        if (new Date(doc.expires_on) <= new Date()) {
          throw new Error("The insurance certificate has already expired. Please upload a current one.");
        }
      }
      const { error: docError } = await admin.from("partner_documents").insert({
        organization_id: organizationId,
        nonprofit_id: nonprofitId,
        doc_type: doc.doc_type,
        file_path: doc.path,
        file_name: doc.file_name,
        expires_on: doc.expires_on ?? null,
        status: "submitted",
      });
      if (docError) throw docError;
    }

    // Surface the application in the existing admin approval queue.
    const { error: subError } = await admin.from("onboarding_submissions").insert({
      organization_name: body.pathway === "one_time_event" ? `${body.event.name} (one-time event, ${body.event.date})` : body.org.name,
      organization_type: submissionType,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: nn(account.phone),
      status: "pending",
      created_organization_id: organizationId,
      created_nonprofit_id: nonprofitId,
    });
    if (subError) throw subError;

    // Tell the admins an application is waiting. Never fail signup on this.
    try {
      await admin.functions.invoke("send-alert", {
        headers: { "x-internal-secret": Deno.env.get("CRON_SECRET") ?? "" },
        body: {
          audience: "admins",
          category: "new_partner_application",
          urgent: false,
          subject: `New partner application: ${body.pathway === "one_time_event" ? body.event.name + " (one-time event)" : body.org.name}`,
          text: `A new ${submissionType.replace(/_/g, " ")} application is awaiting review.\n\n`
            + `Organization: ${body.pathway === "one_time_event" ? body.event.name + " — one-time event on " + body.event.date : body.org.name}\nType: ${submissionType}\n`
            + `Contact: ${contactName}\nEmail: ${contactEmail}`,
        },
      });
    } catch (_) { /* alerting is best-effort */ }

    return new Response(
      JSON.stringify({ success: true, organization_id: organizationId, nonprofit_id: nonprofitId }),
      { status: 200, headers },
    );
  } catch (error: unknown) {
    await rollback().catch(() => {});
    await alertFatalError("complete-partner-signup", error);
    const raw = error instanceof Error ? error.message : String(error);
    console.error("complete-partner-signup failed:", raw);
    if (/duplicate key|already exists/i.test(raw)) {
      return fail("An account with this email already exists.", 409);
    }
    return fail("We could not complete your application. Please try again or contact hello@hariet.ai.", 500);
  }
});
