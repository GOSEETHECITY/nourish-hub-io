import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller and verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: string[] = [];

    // Helper to create user + profile + role
    async function createTestUser(opts: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      role: string;
      organization_id?: string;
      location_id?: string;
      nonprofit_id?: string;
    }) {
      // Check if user already exists
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", opts.email)
        .maybeSingle();

      if (existingProfile) {
        results.push(`SKIP: ${opts.email} already exists`);
        return existingProfile.id;
      }

      // Create auth user
      const { data: authData, error: authError } =
        await adminClient.auth.admin.createUser({
          email: opts.email,
          password: opts.password,
          email_confirm: true,
          user_metadata: {
            first_name: opts.first_name,
            last_name: opts.last_name,
          },
        });

      if (authError) {
        // If user exists in auth but not profiles
        if (authError.message?.includes("already been registered")) {
          results.push(`SKIP: ${opts.email} already registered in auth`);
          return null;
        }
        throw authError;
      }

      const userId = authData.user.id;

      // Update profile with associations
      const profileUpdate: Record<string, string | null> = {
        first_name: opts.first_name,
        last_name: opts.last_name,
        email: opts.email,
      };
      if (opts.organization_id)
        profileUpdate.organization_id = opts.organization_id;
      if (opts.location_id) profileUpdate.location_id = opts.location_id;
      if (opts.nonprofit_id) profileUpdate.nonprofit_id = opts.nonprofit_id;

      await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);

      // Insert role
      await adminClient.from("user_roles").insert({
        user_id: userId,
        role: opts.role,
      });

      results.push(`CREATED: ${opts.email} (${opts.role})`);
      return userId;
    }

    // --- Create Papo Deli as its own organization if needed ---
    let papoDeliOrgId: string;
    const { data: existingPapoDeli } = await adminClient
      .from("organizations")
      .select("id")
      .eq("name", "Papo Deli")
      .maybeSingle();

    if (existingPapoDeli) {
      papoDeliOrgId = existingPapoDeli.id;
      results.push("SKIP: Papo Deli org already exists");
    } else {
      const { data: newOrg, error: orgErr } = await adminClient
        .from("organizations")
        .insert({
          name: "Papo Deli",
          type: "food_beverage_group",
          approval_status: "approved",
          city: "Orlando",
          state: "Florida",
          county: "Orange",
        })
        .select()
        .single();
      if (orgErr) throw orgErr;
      papoDeliOrgId = newOrg.id;
      results.push("CREATED: Papo Deli organization");
    }

    // Ensure Papo Deli has a location
    const { data: papoLocs } = await adminClient
      .from("locations")
      .select("id")
      .eq("organization_id", papoDeliOrgId);
    let papoLocationId: string;
    if (papoLocs && papoLocs.length > 0) {
      papoLocationId = papoLocs[0].id;
    } else {
      const { data: newLoc, error: locErr } = await adminClient
        .from("locations")
        .insert({
          organization_id: papoDeliOrgId,
          name: "Papo Deli — Main",
          location_type: "Deli",
          city: "Orlando",
          state: "Florida",
          county: "Orange",
          address: "123 Main St",
          approval_status: "approved",
        })
        .select()
        .single();
      if (locErr) throw locErr;
      papoLocationId = newLoc.id;
      results.push("CREATED: Papo Deli location");
    }

    // --- Ensure Oak View Group is approved ---
    const oakViewId = "a8894013-7b2f-4cc4-9924-64218009c7c8";
    await adminClient
      .from("organizations")
      .update({ approval_status: "approved" })
      .eq("id", oakViewId);

    // Get first location under Oak View Group
    const { data: oakLocs } = await adminClient
      .from("locations")
      .select("id")
      .eq("organization_id", oakViewId)
      .limit(1);
    const oakLocationId = oakLocs?.[0]?.id || null;

    // --- Create nonprofit: Orlando Food Bank ---
    let nonprofitId: string;
    const { data: existingNp } = await adminClient
      .from("nonprofits")
      .select("id")
      .eq("organization_name", "Orlando Food Bank")
      .maybeSingle();

    if (existingNp) {
      nonprofitId = existingNp.id;
      results.push("SKIP: Orlando Food Bank already exists");
    } else {
      const { data: newNp, error: npErr } = await adminClient
        .from("nonprofits")
        .insert({
          organization_name: "Orlando Food Bank",
          approval_status: "approved",
          city: "Orlando",
          state: "Florida",
          county: "Orange",
          address: "456 Charity Blvd",
          primary_contact: "Test Nonprofit Admin",
          primary_contact_email: "nonprofit@test.hariet.ai",
          ein: "12-3456789",
        })
        .select()
        .single();
      if (npErr) throw npErr;
      nonprofitId = newNp.id;
      results.push("CREATED: Orlando Food Bank nonprofit");
    }

    // --- Create government org: City of Orlando ---
    let govOrgId: string;
    const { data: existingGov } = await adminClient
      .from("organizations")
      .select("id")
      .eq("name", "City of Orlando")
      .maybeSingle();

    if (existingGov) {
      govOrgId = existingGov.id;
      results.push("SKIP: City of Orlando already exists");
    } else {
      const { data: newGov, error: govErr } = await adminClient
        .from("organizations")
        .insert({
          name: "City of Orlando",
          type: "government_entity",
          approval_status: "approved",
          city: "Orlando",
          state: "Florida",
          county: "Orange",
          government_regions: {
            type: "municipal",
            cities: ["Orlando"],
            state: "Florida",
          },
        })
        .select()
        .single();
      if (govErr) throw govErr;
      govOrgId = newGov.id;
      results.push("CREATED: City of Orlando government org");
    }

    // --- Create test users ---
    // 1. Venue Independent
    await createTestUser({
      email: "venue.independent@test.hariet.ai",
      password: "TestHariet2026!",
      first_name: "Venue",
      last_name: "Independent",
      role: "venue_partner",
      organization_id: papoDeliOrgId,
    });

    // 2. Venue Multi-location
    await createTestUser({
      email: "venue.multilocation@test.hariet.ai",
      password: "TestHariet2026!",
      first_name: "Venue",
      last_name: "MultiLocation",
      role: "venue_partner",
      organization_id: oakViewId,
    });

    // 3. Venue Location-level user
    await createTestUser({
      email: "venue.location@test.hariet.ai",
      password: "TestHariet2026!",
      first_name: "Venue",
      last_name: "LocationUser",
      role: "venue_partner",
      organization_id: oakViewId,
      location_id: oakLocationId || undefined,
    });

    // 4. Nonprofit partner
    const npUserId = await createTestUser({
      email: "nonprofit@test.hariet.ai",
      password: "TestHariet2026!",
      first_name: "Nonprofit",
      last_name: "Admin",
      role: "nonprofit_partner",
      nonprofit_id: nonprofitId,
    });

    // Link nonprofit user_id
    if (npUserId) {
      await adminClient
        .from("nonprofits")
        .update({ user_id: npUserId })
        .eq("id", nonprofitId);
    }

    // 5. Government partner
    await createTestUser({
      email: "government@test.hariet.ai",
      password: "TestHariet2026!",
      first_name: "Government",
      last_name: "Rep",
      role: "government_partner",
      organization_id: govOrgId,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("seed-test-data error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
