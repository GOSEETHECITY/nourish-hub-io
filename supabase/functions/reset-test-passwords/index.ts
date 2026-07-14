// One-shot admin utility: reset the six standing test accounts to HarietTest2026!.
// Auth: bearer must be an admin. Emits list of results.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TEST_ACCOUNTS = [
  "hello@goseethecity.com",
  "venue.independent@test.hariet.ai",
  "venue.location@test.hariet.ai",
  "venue.multilocation@test.hariet.ai",
  "nonprofit@test.hariet.ai",
  "government@test.hariet.ai",
  "consumer@test.hariet.ai",
  "venue.franchise@test.hariet.ai",
  "ritas@test.hariet.ai",
  "serengeti@test.hariet.ai",
];
const NEW_PASSWORD = "HarietTest2026!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await anon.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];
    for (const email of TEST_ACCOUNTS) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = list?.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
      if (!u) { results.push({ email, ok: false, error: "not_found" }); continue; }
      const { error } = await admin.auth.admin.updateUserById(u.id, { password: NEW_PASSWORD });
      results.push({ email, ok: !error, error: error?.message });
    }
    return new Response(JSON.stringify({ password: NEW_PASSWORD, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
