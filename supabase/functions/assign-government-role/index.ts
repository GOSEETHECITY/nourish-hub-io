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

    // ATOMIC: consume one use of the invitation code. Returns a row only if
    // the code exists, is active, is a Government code, has not expired, and
    // has remaining uses. This closes the TOCTOU race on max_uses.
    const { data: consumed, error: consumeError } = await adminClient
      .rpc("consume_government_invitation_code", { p_code: invitationCode.trim() });

    if (consumeError || !consumed || (Array.isArray(consumed) && consumed.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Invalid, expired, or exhausted invitation code" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign role
    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: user.id, role: "government_partner" });

    if (insertError) throw insertError;


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
