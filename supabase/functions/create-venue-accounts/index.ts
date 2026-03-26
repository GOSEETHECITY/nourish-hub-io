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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { accounts } = await req.json();
    const results: string[] = [];

    for (const acct of accounts) {
      const { data: existingProfile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", acct.email)
        .maybeSingle();

      if (existingProfile) {
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

      const profileUpdate: Record<string, string | null> = {
        first_name: acct.first_name,
        last_name: acct.last_name,
        email: acct.email,
      };
      if (acct.organization_id) profileUpdate.organization_id = acct.organization_id;
      if (acct.location_id) profileUpdate.location_id = acct.location_id;
      if (acct.nonprofit_id) profileUpdate.nonprofit_id = acct.nonprofit_id;

      await adminClient.from("profiles").update(profileUpdate).eq("id", userId);
      await adminClient.from("user_roles").insert({ user_id: userId, role: acct.role });

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
