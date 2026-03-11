import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate invitation code
    const body = await req.json().catch(() => ({}));
    const invitationCode = body?.invitationCode;
    if (!invitationCode || typeof invitationCode !== "string" || invitationCode.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Invitation code is required for government signup" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Validate invitation code exists and is active
    const { data: codeData, error: codeError } = await adminClient
      .from("invitation_codes")
      .select("id, status, expiration_date")
      .eq("code", invitationCode.trim())
      .eq("status", "active")
      .maybeSingle();

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation code" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (codeData.expiration_date && new Date(codeData.expiration_date) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation code has expired" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user doesn't already have this role
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "government_partner")
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ success: true, message: "Role already assigned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user doesn't already have other roles
    const { data: otherRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (otherRoles && otherRoles.length > 0) {
      return new Response(
        JSON.stringify({ error: "User already has an assigned role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role
    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: user.id, role: "government_partner" });

    if (insertError) throw insertError;

    // Increment times_used on the invitation code
    const { data: currentCode } = await adminClient
      .from("invitation_codes")
      .select("times_used")
      .eq("id", codeData.id)
      .single();

    await adminClient
      .from("invitation_codes")
      .update({ times_used: (currentCode?.times_used ?? 0) + 1 })
      .eq("id", codeData.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Role assignment failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
