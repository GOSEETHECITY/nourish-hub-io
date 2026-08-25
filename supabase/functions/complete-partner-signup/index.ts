// Completes venue / nonprofit / government partner signup with the service role.
//
// Client-side signup cannot do this work: RLS forbids a role-less user from
// creating an organization, and the `profiles` UPDATE policy blocks changing
// organization_id / nonprofit_id. All linking writes happen here behind a
// verified JWT. The account itself is created client-side first (supabase
// auth.signUp), so a signed-out visitor can complete the whole flow.
//
// Only the account, the org (or nonprofit) row, the profile link and the role
// are created. Address, locations, pickup details and the sustainability
// baseline are collected later, after approval.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { alertFatalError } from "../_shared/ops.ts";

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

const VenueSchema = z.object({
  pathway: z.literal("venue"),
  account: AccountSchema,
  org: z.object({
    name: z.string().trim().min(1).max(255),
    type: z.string().trim().min(1).max(64),
  }),
});

const NonprofitSchema = z.object({
  pathway: z.literal("nonprofit"),
  account: AccountSchema,
  org: z.object({
    name: z.string().trim().min(1).max(255),
  }),
});

const GovernmentSchema = z.object({
  pathway: z.literal("government"),
  account: AccountSchema,
  invitationCode: z.string().trim().min(1).max(64),
  org: z.object({
    name: z.string().trim().min(1).max(255),
    type: z.enum(["municipal_government", "county_government", "state_government"]),
  }),
});

const BodySchema = z.discriminatedUnion("pathway", [VenueSchema, NonprofitSchema, GovernmentSchema]);

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

    if (body.pathway === "venue" || body.pathway === "government") {
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

    // Surface the application in the existing admin approval queue.
    const { error: subError } = await admin.from("onboarding_submissions").insert({
      organization_name: body.org.name,
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
        body: {
          to_email: "hello@goseethecity.com",
          category: "new_partner_application",
          urgent: false,
          subject: `New partner application: ${body.org.name}`,
          text: `A new ${submissionType.replace(/_/g, " ")} application is awaiting review.\n\n`
            + `Organization: ${body.org.name}\nType: ${submissionType}\n`
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
