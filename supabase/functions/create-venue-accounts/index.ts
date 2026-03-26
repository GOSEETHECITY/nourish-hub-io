import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Allow service role key as auth
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isServiceRole) {
      // Verify caller is admin
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
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { accounts } = await req.json();
    const results: string[] = [];

    for (const acct of accounts) {
      // Check if profile already exists
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", acct.email)
        .maybeSingle();

      if (existingProfile) {
        // Reset password for existing user
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(
          existingProfile.id,
          { password: acct.password }
        );
        if (updateErr) {
          results.push(`ERROR updating ${acct.email}: ${updateErr.message}`);
        } else {
          results.push(`UPDATED password: ${acct.email}`);
        }
        continue;
      }

      // Create new auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        email_confirm: true,
        user_metadata: { first_name: acct.first_name, last_name: acct.last_name },
      });

      if (authError) {
        results.push(`ERROR creating ${acct.email}: ${authError.message}`);
        continue;
      }

      const userId = authData.user.id;

      // Update profile
      await adminClient.from("profiles").update({
        first_name: acct.first_name,
        last_name: acct.last_name,
        email: acct.email,
        organization_id: acct.organization_id,
        location_id: acct.location_id || null,
      }).eq("id", userId);

      // Insert role
      await adminClient.from("user_roles").insert({
        user_id: userId,
        role: acct.role,
      });

      results.push(`CREATED: ${acct.email} (${acct.role})`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
