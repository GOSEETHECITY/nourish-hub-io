// Completes venue / nonprofit partner signup with the service role.
//
// Client-side signup cannot do this work: RLS forbids a role-less user from
// updating `organizations`, and the `profiles` UPDATE policy explicitly blocks
// changing organization_id / nonprofit_id / location_id. Rather than widening
// those policies, all linking writes happen here behind a verified JWT.
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
  // Lovable preview / published origins and local dev are allowed so the flow
  // is testable before it reaches production.
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
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    state: z.string().max(64).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    county: z.string().max(120).optional().nullable(),
    contactName: z.string().max(255).optional().nullable(),
    contactEmail: z.string().max(255).optional().nullable(),
    contactPhone: z.string().max(40).optional().nullable(),
    billingContact: z.string().max(255).optional().nullable(),
    joinCode: z.string().max(32).optional().nullable(),
  }),
  loc: z.object({
    name: z.string().trim().min(1).max(255),
    locationType: z.string().max(120).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    state: z.string().max(64).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    county: z.string().max(120).optional().nullable(),
    pickupAddress: z.string().max(255).optional().nullable(),
    pickupInstructions: z.string().max(2000).optional().nullable(),
    hours: z.string().max(500).optional().nullable(),
    surplusFrequency: z.string().max(120).optional().nullable(),
  }),
  baseline: z
    .object({
      generates_surplus: z.boolean().optional().nullable(),
      estimated_daily_surplus: z.string().max(120).optional().nullable(),
      surplus_types: z.array(z.string().max(120)).optional().nullable(),
      current_handling: z.string().max(500).optional().nullable(),
      donation_frequency: z.string().max(120).optional().nullable(),
      priority_outcomes: z.array(z.string().max(255)).optional().nullable(),
    })
    .optional()
    .nullable(),
});

const NonprofitSchema = z.object({
  pathway: z.literal("nonprofit"),
  account: AccountSchema,
  org: z.object({
    name: z.string().trim().min(1).max(255),
    ein: z.string().max(20).optional().nullable(),
    website: z.string().max(255).optional().nullable(),
    socialHandles: z.string().max(500).optional().nullable(),
    contactName: z.string().max(255).optional().nullable(),
    contactEmail: z.string().max(255).optional().nullable(),
    contactPhone: z.string().max(40).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    state: z.string().max(64).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    county: z.string().max(120).optional().nullable(),
    operatingHours: z.string().max(500).optional().nullable(),
    joinCode: z.string().max(32).optional().nullable(),
  }),
  loc: z.object({
    name: z.string().trim().min(1).max(255),
    address: z.string().max(255).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    state: z.string().max(64).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    county: z.string().max(120).optional().nullable(),
    operatingHours: z.string().max(500).optional().nullable(),
    pickupDropoff: z.string().max(2000).optional().nullable(),
  }),
  capacity: z.object({
    coldStorage: z.boolean(),
    refrigeration: z.boolean(),
    cabinetry: z.boolean(),
    foodTypes: z.array(z.string().max(64)),
    weeklyServed: z.string().max(20).optional().nullable(),
    populations: z.array(z.string().max(120)),
  }),
  documents: z.object({
    proofOfInsurancePath: z.string().max(500).optional().nullable(),
    signedAgreementPath: z.string().max(500).optional().nullable(),
  }),
});

const BodySchema = z.discriminatedUnion("pathway", [VenueSchema, NonprofitSchema]);

const nn = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : (s as string | null);
};

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Rows created in this call, newest first, so a failure can unwind cleanly.
  const undo: Array<{ table: string; id: string }> = [];
  const rollback = async () => {
    for (const row of undo.reverse()) {
      await admin.from(row.table).delete().eq("id", row.id);
    }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), { status: 401, headers });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }), {
        status: 400,
        headers,
      });
    }
    const body = parsed.data;

    // A user may only complete partner signup once.
    const { data: existingRoles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (existingRoles && existingRoles.length > 0) {
      return new Response(JSON.stringify({ error: "This account already has a partner role assigned." }), {
        status: 409,
        headers,
      });
    }

    const account = body.account;
    let submissionType: string;
    let organizationId: string | null = null;
    let nonprofitId: string | null = null;

    if (body.pathway === "venue") {
      const { org, loc, baseline } = body;
      submissionType = org.type;

      const { data: orgRow, error: orgError } = await admin
        .from("organizations")
        .insert({
          name: org.name,
          type: org.type,
          primary_contact_name: nn(org.contactName),
          primary_contact_email: nn(org.contactEmail),
          primary_contact_phone: nn(org.contactPhone),
          billing_contact: nn(org.billingContact),
          address: nn(org.address),
          city: nn(org.city),
          state: nn(org.state),
          zip: nn(org.zip),
          county: nn(org.county),
          approval_status: "pending",
          join_code: nn(org.joinCode),
        })
        .select("id")
        .single();
      if (orgError) throw orgError;
      organizationId = orgRow.id;
      undo.push({ table: "organizations", id: orgRow.id });

      const { data: locRow, error: locError } = await admin
        .from("locations")
        .insert({
          organization_id: organizationId,
          name: loc.name,
          location_type: nn(loc.locationType),
          address: nn(loc.address),
          city: nn(loc.city),
          state: nn(loc.state),
          zip: nn(loc.zip),
          county: nn(loc.county),
          pickup_address: nn(loc.pickupAddress) ?? nn(loc.address),
          pickup_instructions: nn(loc.pickupInstructions),
          hours_of_operation: nn(loc.hours),
          estimated_surplus_frequency: nn(loc.surplusFrequency),
        })
        .select("id")
        .single();
      if (locError) throw locError;
      undo.push({ table: "locations", id: locRow.id });

      if (baseline) {
        const { data: baseRow, error: baseError } = await admin
          .from("sustainability_baseline")
          .insert({
            location_id: locRow.id,
            generates_surplus: baseline.generates_surplus ?? null,
            estimated_daily_surplus: nn(baseline.estimated_daily_surplus),
            surplus_types: baseline.surplus_types?.length ? baseline.surplus_types : null,
            current_handling: nn(baseline.current_handling),
            donation_frequency: nn(baseline.donation_frequency),
            priority_outcomes: baseline.priority_outcomes?.length ? baseline.priority_outcomes : null,
          })
          .select("id")
          .single();
        if (baseError) throw baseError;
        undo.push({ table: "sustainability_baseline", id: baseRow.id });
      }

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          first_name: account.firstName,
          last_name: account.lastName,
          phone: nn(account.phone),
          organization_id: organizationId,
          location_id: locRow.id,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: user.id, role: "venue_partner" });
      if (roleError) throw roleError;
    } else {
      const { org, loc, capacity, documents } = body;
      submissionType = "nonprofit";

      const { data: npRow, error: npError } = await admin
        .from("nonprofits")
        .insert({
          user_id: user.id,
          organization_name: org.name,
          ein: nn(org.ein),
          website: nn(org.website),
          social_handles: nn(org.socialHandles) ? { handles: org.socialHandles } : null,
          primary_contact: nn(org.contactName),
          primary_contact_email: nn(org.contactEmail),
          primary_contact_phone: nn(org.contactPhone),
          address: nn(org.address),
          city: nn(org.city),
          state: nn(org.state),
          zip: nn(org.zip),
          county: nn(org.county),
          operating_hours: nn(org.operatingHours),
          cold_storage: capacity.coldStorage,
          refrigeration: capacity.refrigeration,
          cabinetry: capacity.cabinetry,
          food_types_accepted: capacity.foodTypes.length ? capacity.foodTypes : null,
          estimated_weekly_served: capacity.weeklyServed ? parseInt(capacity.weeklyServed, 10) || null : null,
          population_served: capacity.populations.length ? capacity.populations.join(", ") : null,
          proof_of_insurance_url: nn(documents.proofOfInsurancePath),
          signed_agreement_url: nn(documents.signedAgreementPath),
          approval_status: "pending",
          join_code: nn(org.joinCode),
        })
        .select("id")
        .single();
      if (npError) throw npError;
      nonprofitId = npRow.id;
      undo.push({ table: "nonprofits", id: npRow.id });

      const { data: npLocRow, error: npLocError } = await admin
        .from("nonprofit_locations")
        .insert({
          nonprofit_id: nonprofitId,
          name: loc.name,
          address: nn(loc.address),
          city: nn(loc.city),
          state: nn(loc.state),
          zip: nn(loc.zip),
          county: nn(loc.county),
          operating_hours: nn(loc.operatingHours),
          pickup_dropoff_instructions: nn(loc.pickupDropoff),
          cold_storage: capacity.coldStorage,
          refrigeration: capacity.refrigeration,
          cabinetry: capacity.cabinetry,
          food_types_accepted: capacity.foodTypes.length ? capacity.foodTypes : null,
          estimated_weekly_served: capacity.weeklyServed ? parseInt(capacity.weeklyServed, 10) || null : null,
          population_served: capacity.populations.length ? capacity.populations.join(", ") : null,
          approval_status: "pending",
        })
        .select("id")
        .single();
      if (npLocError) throw npLocError;
      undo.push({ table: "nonprofit_locations", id: npLocRow.id });

      const { error: profileError } = await admin
        .from("profiles")
        .update({
          first_name: account.firstName,
          last_name: account.lastName,
          phone: nn(account.phone),
          nonprofit_id: nonprofitId,
          nonprofit_location_id: npLocRow.id,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: roleError } = await admin
        .from("user_roles")
        .insert({ user_id: user.id, role: "nonprofit_partner" });
      if (roleError) throw roleError;
    }

    // Surface the application in the existing admin approval queue.
    const orgBlock = body.org as Record<string, unknown>;
    const { error: subError } = await admin.from("onboarding_submissions").insert({
      organization_name: body.org.name,
      organization_type: submissionType,
      address: nn(orgBlock.address),
      city: nn(orgBlock.city),
      state: nn(orgBlock.state),
      zip_code: nn(orgBlock.zip),
      contact_name: nn(orgBlock.contactName) ?? `${account.firstName} ${account.lastName}`.trim(),
      contact_email: nn(orgBlock.contactEmail) ?? user.email ?? "",
      contact_phone: nn(orgBlock.contactPhone) ?? nn(account.phone),
      ein: nn(orgBlock.ein),
      status: "pending",
      created_organization_id: organizationId,
      created_nonprofit_id: nonprofitId,
    });
    if (subError) throw subError;

    return new Response(
      JSON.stringify({ success: true, organization_id: organizationId, nonprofit_id: nonprofitId }),
      { status: 200, headers },
    );
  } catch (error: unknown) {
    await rollback().catch(() => {});
    await alertFatalError("complete-partner-signup", error);
    const message = error instanceof Error ? error.message : "Signup could not be completed";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
});
